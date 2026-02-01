#!/bin/bash
set -euo pipefail

# Starbunk Health Check Script
# Verifies all containers are running and healthy after deployment
# Called by CircleCI deploy job via SSH

COMPOSE_DIR="${1:-/mnt/user/appdata/starbunk}"
RETRY_COUNT=3
RETRY_DELAY=10

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏥 Starbunk Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📂 Compose Directory: ${COMPOSE_DIR}"
echo "⏰ Time: $(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$COMPOSE_DIR"

# Determine docker-compose command
if command -v docker-compose &> /dev/null; then
  COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
  COMPOSE_CMD="docker compose"
else
  echo "❌ Error: Neither docker-compose nor docker compose is available"
  exit 1
fi

# Expected services (modify this list based on your actual services)
EXPECTED_SERVICES=(
  "bunkbot"
  "djcova"
  "covabot"
  "bluebot"
)

# Check if all expected containers are running
check_containers_running() {
  echo ""
  echo "🔍 Checking container status..."

  ALL_RUNNING=true

  for service in "${EXPECTED_SERVICES[@]}"; do
    # Get container name and status
    CONTAINER_INFO=$($COMPOSE_CMD ps "$service" --format json 2>/dev/null | jq -r '.Name + " | " + .State' || echo "")

    if [ -z "$CONTAINER_INFO" ]; then
      echo "❌ $service: NOT FOUND"
      ALL_RUNNING=false
      continue
    fi

    CONTAINER_NAME=$(echo "$CONTAINER_INFO" | cut -d'|' -f1 | xargs)
    CONTAINER_STATE=$(echo "$CONTAINER_INFO" | cut -d'|' -f2 | xargs)

    if [ "$CONTAINER_STATE" = "running" ]; then
      echo "✅ $service: RUNNING ($CONTAINER_NAME)"
    else
      echo "❌ $service: $CONTAINER_STATE ($CONTAINER_NAME)"
      ALL_RUNNING=false
    fi
  done

  if [ "$ALL_RUNNING" = false ]; then
    return 1
  fi

  return 0
}

# Check container health endpoints (if available)
check_health_endpoints() {
  echo ""
  echo "🩺 Checking health endpoints..."

  # Define service health endpoints
  # Format: "service_name:container_name:port:path"
  HEALTH_ENDPOINTS=(
    "bunkbot:starbunk-bunkbot:7081:/health"
    "djcova:starbunk-djcova:3000:/health"
    "covabot:starbunk-covabot:3000:/health"
    "bluebot:starbunk-bluebot:3000:/health"
  )

  ALL_HEALTHY=true

  for endpoint in "${HEALTH_ENDPOINTS[@]}"; do
    IFS=':' read -r service container port path <<< "$endpoint"

    # Try to curl the health endpoint from inside the container
    # Use docker exec to avoid network access issues
    HEALTH_RESPONSE=$(docker exec "$container" wget -qO- "http://localhost:${port}${path}" 2>/dev/null || echo "ERROR")

    if [ "$HEALTH_RESPONSE" != "ERROR" ]; then
      # Check if response contains "ok" or "healthy" or HTTP 200 semantics
      if echo "$HEALTH_RESPONSE" | grep -qiE '(ok|healthy|"status".*"up")'; then
        echo "✅ $service: HEALTHY"
      else
        echo "⚠️  $service: Response received but unexpected format"
        echo "   Response: ${HEALTH_RESPONSE:0:100}"
      fi
    else
      echo "⚠️  $service: Health endpoint not accessible (may not be implemented)"
      # Don't fail on health endpoint checks as they may not be implemented yet
    fi
  done

  # Always return success for health endpoint checks for now
  return 0
}

# Check container logs for errors
check_container_logs() {
  echo ""
  echo "📋 Checking recent logs for errors..."

  ERRORS_FOUND=false

  for service in "${EXPECTED_SERVICES[@]}"; do
    # Get last 50 lines of logs and check for common error patterns
    RECENT_LOGS=$($COMPOSE_CMD logs --tail=50 "$service" 2>/dev/null || echo "")

    if [ -z "$RECENT_LOGS" ]; then
      echo "⚠️  $service: Could not retrieve logs"
      continue
    fi

    # Count critical errors in recent logs
    ERROR_COUNT=$(echo "$RECENT_LOGS" | grep -icE '(fatal|critical|error|exception|panic|crash)' || echo "0")

    if [ "$ERROR_COUNT" -gt 5 ]; then
      echo "⚠️  $service: ${ERROR_COUNT} potential errors in recent logs"
      ERRORS_FOUND=true

      # Show sample of errors
      echo "   Sample errors:"
      echo "$RECENT_LOGS" | grep -iE '(fatal|critical|error|exception)' | head -3 | sed 's/^/   | /'
    else
      echo "✅ $service: No critical errors in recent logs"
    fi
  done

  # Don't fail deployment on log errors, just warn
  return 0
}

# Check container restart counts
check_restart_counts() {
  echo ""
  echo "🔄 Checking container restart history..."

  EXCESSIVE_RESTARTS=false

  for service in "${EXPECTED_SERVICES[@]}"; do
    # Get container ID
    CONTAINER_ID=$(docker ps -q -f name="starbunk-${service}" 2>/dev/null || echo "")

    if [ -z "$CONTAINER_ID" ]; then
      continue
    fi

    # Get restart count from docker inspect
    RESTART_COUNT=$(docker inspect "$CONTAINER_ID" --format='{{.RestartCount}}' 2>/dev/null || echo "0")

    if [ "$RESTART_COUNT" -gt 3 ]; then
      echo "⚠️  $service: Restarted ${RESTART_COUNT} times (may indicate issues)"
      EXCESSIVE_RESTARTS=true
    else
      echo "✅ $service: Restart count: ${RESTART_COUNT}"
    fi
  done

  if [ "$EXCESSIVE_RESTARTS" = true ]; then
    echo ""
    echo "⚠️  WARNING: Some containers have high restart counts"
    echo "   This may indicate instability, but deployment will continue"
  fi

  return 0
}

# Main health check flow
main() {
  ATTEMPT=1

  while [ $ATTEMPT -le $RETRY_COUNT ]; do
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔍 Health Check Attempt $ATTEMPT of $RETRY_COUNT"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if check_containers_running; then
      echo ""
      echo "✅ All containers are running!"

      # Run additional checks
      check_health_endpoints
      check_restart_counts
      check_container_logs

      echo ""
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo "✅ Health Check PASSED"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      echo "⏰ Completed: $(date)"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

      exit 0
    fi

    if [ $ATTEMPT -lt $RETRY_COUNT ]; then
      echo ""
      echo "⏳ Retrying in ${RETRY_DELAY} seconds..."
      sleep $RETRY_DELAY
    fi

    ATTEMPT=$((ATTEMPT + 1))
  done

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌ Health Check FAILED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Some containers are not running after $RETRY_COUNT attempts"
  echo ""
  echo "Current container status:"
  $COMPOSE_CMD ps
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  exit 1
}

# Execute health check
main
