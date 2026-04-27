#!/bin/bash
set -euo pipefail

# Starbunk Production Deployment Script
# Runs on Unraid server to pull latest images and restart services
# Called by CircleCI deploy job via SSH

COMPOSE_DIR="${1}"
DEPLOY_TAG="${2:-main}"
VERSION="${3:-unknown}"
INCOMING_COMPOSE="${4:-}"  # optional path to a new docker-compose.yml to install after backup

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Starbunk Production Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📂 Compose Directory: ${COMPOSE_DIR}"
echo "🏷️  Deploy Tag: ${DEPLOY_TAG}"
echo "📦 Version: ${VERSION}"
echo "⏰ Time: $(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify compose directory exists
if [ ! -d "$COMPOSE_DIR" ]; then
  echo "❌ Error: Compose directory not found: $COMPOSE_DIR"
  exit 1
fi

if [ -z "$COMPOSE_DIR" ]; then
  echo "❌ Error: COMPOSE_DIR argument is required"
  exit 1
fi

cd "$COMPOSE_DIR"

# Verify docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
  echo "❌ Error: docker-compose.yml not found in $COMPOSE_DIR"
  exit 1
fi

# Check if docker-compose or docker compose is available
if command -v docker-compose &> /dev/null; then
  COMPOSE_CMD="docker-compose --env-file stack.env"
elif docker compose version &> /dev/null; then
  COMPOSE_CMD="docker compose --env-file stack.env"
else
  echo "❌ Error: Neither docker-compose nor docker compose is available"
  exit 1
fi

echo "✅ Using: $COMPOSE_CMD"
echo ""

# Function to get current container image digests
get_current_digests() {
  echo "📸 Capturing current container image digests..."
  $COMPOSE_CMD images --format json 2>/dev/null | jq -r '.Repository + ":" + .Tag + " = " + .ID' > /tmp/starbunk-digests-before.txt || true

  if [ -f /tmp/starbunk-digests-before.txt ]; then
    cat /tmp/starbunk-digests-before.txt
  else
    echo "⚠️  Could not capture current digests"
  fi
  echo ""
}

# Backup current state
backup_current_state() {
  echo "💾 Backing up current deployment state..."
  BACKUP_DIR="${COMPOSE_DIR}/backups/deployment-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BACKUP_DIR"

  # Backup docker-compose.yml and stack.env
  cp docker-compose.yml "$BACKUP_DIR/" 2>/dev/null || true
  cp stack.env "$BACKUP_DIR/" 2>/dev/null || true

  # Save current container list
  $COMPOSE_CMD ps --format json > "$BACKUP_DIR/containers.json" 2>/dev/null || true

  echo "✅ Backup saved to: $BACKUP_DIR"
  echo ""
}

# Install incoming docker-compose.yml (after backup, so backup reflects previous state)
install_incoming_compose() {
  if [ -n "$INCOMING_COMPOSE" ] && [ -f "$INCOMING_COMPOSE" ]; then
    echo "📋 Installing new docker-compose.yml from: $INCOMING_COMPOSE"
    mv "$INCOMING_COMPOSE" docker-compose.yml
    echo "✅ docker-compose.yml updated"
    echo ""
  fi
}

# Pull latest images
pull_images() {
  echo "📥 Pulling latest container images (tag: ${DEPLOY_TAG})..."

  # Set the image tag in environment for docker-compose
  export IMAGE_TAG="${DEPLOY_TAG}"

  # Pull images with timeout
  timeout 600 $COMPOSE_CMD pull --quiet || {
    echo "❌ Error: Image pull timed out or failed"
    exit 1
  }

  echo "✅ Images pulled successfully"
  echo ""
}

# Restart services
restart_services() {
  echo "🔄 Restarting services with new images..."

  # Use --force-recreate to ensure containers are rebuilt with new images
  # Use --no-build to prevent local builds (we want to use pulled images)
  $COMPOSE_CMD up -d --force-recreate --no-build

  EXIT_CODE=$?
  if [ $EXIT_CODE -ne 0 ]; then
    echo "❌ Error: Service restart failed with exit code $EXIT_CODE"
    exit $EXIT_CODE
  fi

  echo "✅ Services restarted"
  echo ""
}

# Wait for containers to stabilize
wait_for_stability() {
  echo "⏳ Waiting for containers to stabilize..."
  sleep 15
  echo "✅ Stability wait complete"
  echo ""
}

# Display running containers
show_container_status() {
  echo "📊 Current Container Status:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  $COMPOSE_CMD ps
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
}

# Verify no containers are in restart loop
check_restart_loops() {
  echo "🔍 Checking for restart loops..."

  # Get container restart counts
  RESTART_COUNTS=$($COMPOSE_CMD ps --format json 2>/dev/null | jq -r '.Name + ": " + (.RunningFor // "unknown")' || echo "")

  if [ -n "$RESTART_COUNTS" ]; then
    echo "$RESTART_COUNTS"
  fi

  # Check if any containers are in restarting state
  RESTARTING=$($COMPOSE_CMD ps --filter "status=restarting" --format json 2>/dev/null | jq -r '.Name' || echo "")

  if [ -n "$RESTARTING" ]; then
    echo "⚠️  WARNING: Containers in restarting state:"
    echo "$RESTARTING"
    return 1
  else
    echo "✅ No restart loops detected"
  fi
  echo ""
}

# Main deployment flow
main() {
  get_current_digests
  backup_current_state
  install_incoming_compose
  pull_images
  restart_services
  wait_for_stability
  show_container_status
  check_restart_loops

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ Deployment completed successfully!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 Version: ${VERSION}"
  echo "🏷️  Tag: ${DEPLOY_TAG}"
  echo "⏰ Completed: $(date)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Execute deployment
main
