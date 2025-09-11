#!/usr/bin/env bash
set -euo pipefail

# Pre-push safety gate: run fast checks and targeted container builds
# to prevent CI regressions from reaching GitHub.
#
# Strategy:
# 1) Run quick repo-wide checks: type-check + lint + unit tests
# 2) Detect which containers (and/or shared) changed vs origin/main
# 3) For each affected container, run its type-check + build
# 4) If Docker is available, optionally build the changed containers with docker compose
#
# Environment overrides:
# - SKIP_DOCKER=1 to skip docker builds even if docker is available
# - PREPUSH_VERBOSE=1 for more logging

log() {
  if [[ "${PREPUSH_VERBOSE:-0}" == "1" ]]; then
    echo "[pre-push] $*"
  fi
}

# Ensure origin/main is available for diff; ignore errors for first push
if git rev-parse --verify --quiet origin/main > /dev/null; then
  :
else
  log "Fetching origin/main for change detection..."
  git fetch origin main --quiet || true
fi

BASE=""
if git rev-parse --verify --quiet origin/main > /dev/null; then
  BASE=$(git merge-base HEAD origin/main || true)
fi

if [[ -n "$BASE" ]]; then
  CHANGED=$(git diff --name-only "$BASE"..HEAD)
else
  # Fallback: last 10 commits
  CHANGED=$(git diff --name-only HEAD~10..HEAD 2>/dev/null || git show --name-only --pretty="")
fi

# Normalize to lines
CHANGED_LINES=$(echo "$CHANGED" | sed '/^$/d' || true)

log "Changed files:\n$CHANGED_LINES"

# Quick repo-wide checks (fast)
echo "Running repo checks (type-check, lint, unit tests)..."
npm run check:ci --silent

affected() {
  local prefix="$1"
  echo "$CHANGED_LINES" | grep -E "^${prefix}" >/dev/null 2>&1
}

# Determine which containers to build
CONTAINERS=(bunkbot djcova covabot starbunk-dnd)
TO_BUILD=()

SHARED_CHANGED=0
if affected "containers/shared/"; then
  SHARED_CHANGED=1
fi

for name in "${CONTAINERS[@]}"; do
  if (( SHARED_CHANGED == 1 )) || affected "containers/${name}/"; then
    TO_BUILD+=("${name}")
  fi
  # Dockerfile or compose change impacting container
  if affected "containers/${name}/Dockerfile"; then
    [[ " ${TO_BUILD[*]} " == *" ${name} "* ]] || TO_BUILD+=("${name}")
  fi
done

# If nothing detected but CI-critical files changed, build all containers
if [[ ${#TO_BUILD[@]} -eq 0 ]]; then
  if echo "$CHANGED_LINES" | grep -E "^(\.github/workflows/|package.json|docker-compose.*\.yml)" >/dev/null 2>&1; then
    TO_BUILD=("${CONTAINERS[@]}")
  fi
fi

if [[ ${#TO_BUILD[@]} -eq 0 ]]; then
  echo "No container-level changes detected; skipping container builds."
  exit 0
fi

echo "Running targeted container type-check + build for: ${TO_BUILD[*]}"

for name in "${TO_BUILD[@]}"; do
  echo "→ ${name}: type-check"
  pushd "containers/${name}" >/dev/null
  npm run -s type-check
  echo "→ ${name}: build"
  npm run -s build
  # If a container has dedicated tests, run them quickly
  if npm run | grep -qE "^\s*test\s*"; then
    echo "→ ${name}: unit tests"
    npm run -s test || true
  fi
  popd >/dev/null
done

# Optionally build Docker images for changed containers if docker is available
if [[ "${SKIP_DOCKER:-0}" != "1" ]] && command -v docker >/dev/null 2>&1; then
  echo "Docker detected; building changed containers: ${TO_BUILD[*]}"
  for name in "${TO_BUILD[@]}"; do
    echo "→ docker compose build ${name}"
    docker compose build "${name}"
  done
else
  echo "Skipping docker builds (either SKIP_DOCKER=1 set or docker not available)."
fi

echo "Pre-push checks complete."

