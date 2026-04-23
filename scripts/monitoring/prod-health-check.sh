#!/bin/bash

# Script to check the health and status of Starbunk-JS Docker containers.
# Checks both Docker container state and the /health endpoint module data,
# surfacing: app not responding, crashes, trigger-response discrepancies,
# silence, elevated error rates, and voice connection issues.

echo "--- Starbunk-JS Application Health Check ---"
echo "Timestamp: $(date)"
echo ""

# App containers that expose a /health endpoint on port 3000
APP_CONTAINERS="starbunk-bunkbot starbunk-bluebot starbunk-covabot starbunk-djcova"

STARBUNK_CONTAINERS=$(docker ps -a --format "{{.Names}}" | grep "starbunk-")

if [ -z "$STARBUNK_CONTAINERS" ]; then
  echo "No Starbunk-JS containers found. The application might not be deployed or running."
  exit 0
fi

OVERALL_HEALTH="HEALTHY"

# ── Helper: parse and report health module data from /health JSON ──────────────
check_health_endpoint() {
  local container="$1"
  local health_json
  health_json=$(docker exec "$container" curl -sf --max-time 5 http://localhost:3000/health 2>/dev/null)

  if [ -z "$health_json" ]; then
    echo "  [HEALTH ENDPOINT] Could not reach http://localhost:3000/health — endpoint unresponsive"
    OVERALL_HEALTH="UNHEALTHY"
    return
  fi

  # Parse with Python3 (available on all modern systems)
  python3 - "$container" <<PYEOF 2>/dev/null
import sys, json

container = sys.argv[1]
raw = """$health_json"""
try:
    data = json.loads(raw)
except Exception as e:
    print(f"  [HEALTH ENDPOINT] JSON parse error: {e}")
    sys.exit(1)

top_status = data.get("status", "unknown")
uptime_ms = data.get("uptime", 0)
modules = data.get("modules", {})

print(f"  [HEALTH ENDPOINT] App status: {top_status}, uptime: {uptime_ms // 1000}s")

for mod_name, mod in modules.items():
    if not isinstance(mod, dict):
        continue

    mod_status = mod.get("status", "unknown")
    warnings = mod.get("warnings", [])
    silence_ms = mod.get("silence_ms")
    window = mod.get("window", {})
    triggers = window.get("triggers_fired", 0)
    responses_ok = window.get("responses_ok", 0)
    responses_failed = window.get("responses_failed", 0)
    errors = window.get("errors", 0)
    last_msg = mod.get("last_message_at", "never")

    status_icon = "✓" if mod_status == "ok" else ("⚠" if mod_status == "degraded" else "✗")
    print(f"  {status_icon} [{mod_name}] status={mod_status}  last_msg={last_msg}")

    if warnings:
        for w in warnings:
            print(f"      WARNING: {w}")

    if triggers > 0:
        print(f"      Activity (5m window): triggers={triggers}, responses_ok={responses_ok}, responses_failed={responses_failed}, errors={errors}")

    # Explicit discrepancy report (even if not caught as a warning yet)
    if triggers > 0 and responses_ok == 0 and responses_failed == 0:
        # Triggers fired but no response outcome recorded — possible silent drop
        print(f"      NOTE: {triggers} trigger(s) fired with no response outcome recorded")

PYEOF

  # Grep-based fallback for critical/degraded status (catches Python unavailability)
  if echo "$health_json" | grep -q '"status":"critical"'; then
    echo "  [HEALTH ENDPOINT] CRITICAL module status detected"
    OVERALL_HEALTH="UNHEALTHY"
  elif echo "$health_json" | grep -q '"status":"degraded"'; then
    echo "  [HEALTH ENDPOINT] DEGRADED module status detected"
    [ "$OVERALL_HEALTH" = "HEALTHY" ] && OVERALL_HEALTH="DEGRADED"
  fi

  # Silence: silence_ms field > 30 minutes (1800000 ms)
  local silence
  silence=$(echo "$health_json" | grep -o '"silence_ms":[0-9]*' | head -1 | cut -d: -f2)
  if [ -n "$silence" ] && [ "$silence" -gt 1800000 ] 2>/dev/null; then
    echo "  [HEALTH ENDPOINT] WARNING: Bot silent for $((silence / 60000)) minutes"
    [ "$OVERALL_HEALTH" = "HEALTHY" ] && OVERALL_HEALTH="DEGRADED"
  fi
}

# ── Per-container checks ───────────────────────────────────────────────────────
for CONTAINER_NAME in $STARBUNK_CONTAINERS; do
  echo "--------------------------------------------------"
  echo "Container: $CONTAINER_NAME"

  STATUS=$(docker inspect --format "{{.State.Status}}" "$CONTAINER_NAME" 2>/dev/null)
  HEALTH=$(docker inspect --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}N/A{{end}}" "$CONTAINER_NAME" 2>/dev/null)
  EXIT_CODE=$(docker inspect --format "{{.State.ExitCode}}" "$CONTAINER_NAME" 2>/dev/null)
  RESTART_COUNT=$(docker inspect --format "{{.RestartCount}}" "$CONTAINER_NAME" 2>/dev/null)

  echo "  Status: $STATUS  |  Docker health: $HEALTH  |  Restarts: $RESTART_COUNT"

  if [ "$STATUS" = "exited" ]; then
    echo "  EXIT CODE: $EXIT_CODE — container stopped unexpectedly"
    echo "  Last 20 log lines:"
    docker logs "$CONTAINER_NAME" --tail 20 2>&1 | sed 's/^/    /'
    OVERALL_HEALTH="UNHEALTHY"

  elif [ "$HEALTH" = "unhealthy" ]; then
    echo "  Docker healthcheck UNHEALTHY — last 20 log lines:"
    docker logs "$CONTAINER_NAME" --tail 20 2>&1 | sed 's/^/    /'
    OVERALL_HEALTH="UNHEALTHY"

  elif [ "$STATUS" = "running" ] && [ "$HEALTH" = "starting" ]; then
    echo "  Container is still starting up."
    [ "$OVERALL_HEALTH" = "HEALTHY" ] && OVERALL_HEALTH="STARTING"

  elif [ "$STATUS" = "running" ] && [ "$HEALTH" = "N/A" ]; then
    echo "  Running (no Docker healthcheck defined)"
  fi

  # High restart count warning
  if [ -n "$RESTART_COUNT" ] && [ "$RESTART_COUNT" -gt 3 ] 2>/dev/null; then
    echo "  WARNING: $RESTART_COUNT restart(s) detected — container may be crash-looping"
    [ "$OVERALL_HEALTH" = "HEALTHY" ] && OVERALL_HEALTH="DEGRADED"
  fi

  # Query /health endpoint for app containers
  if echo "$APP_CONTAINERS" | grep -qw "$CONTAINER_NAME"; then
    if [ "$STATUS" = "running" ]; then
      check_health_endpoint "$CONTAINER_NAME"
    fi
  fi
done

echo "--------------------------------------------------"
echo ""
echo "Overall Starbunk-JS Application Health: $OVERALL_HEALTH"
echo "HEALTH_STATUS=$(echo "$OVERALL_HEALTH" | tr '[:upper:]' '[:lower:]')"
echo "--- End Health Check ---"
