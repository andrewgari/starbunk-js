#!/bin/bash
set -euo pipefail

# Starbunk Emergency Rollback Script
# Rolls back to the previous deployment in case of critical failure
# Can be run manually on Unraid server or triggered via CircleCI

COMPOSE_DIR="${1:-/mnt/user/appdata/starbunk}"
ROLLBACK_TO="${2:-previous}"  # "previous" or specific backup directory name

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Starbunk Emergency Rollback"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  WARNING: This will revert to a previous deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📂 Compose Directory: ${COMPOSE_DIR}"
echo "🎯 Rollback Target: ${ROLLBACK_TO}"
echo "⏰ Time: $(date)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify compose directory exists
if [ ! -d "$COMPOSE_DIR" ]; then
  echo "❌ Error: Compose directory not found: $COMPOSE_DIR"
  exit 1
fi

cd "$COMPOSE_DIR"

# Verify backups directory exists
BACKUP_BASE_DIR="${COMPOSE_DIR}/backups"
if [ ! -d "$BACKUP_BASE_DIR" ]; then
  echo "❌ Error: Backups directory not found: $BACKUP_BASE_DIR"
  echo "   Cannot rollback without backups"
  exit 1
fi

# Determine docker-compose command
if command -v docker-compose &> /dev/null; then
  COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
  COMPOSE_CMD="docker compose"
else
  echo "❌ Error: Neither docker-compose nor docker compose is available"
  exit 1
fi

# Find the backup to restore
find_backup() {
  if [ "$ROLLBACK_TO" = "previous" ]; then
    # Find the most recent backup
    BACKUP_DIR=$(ls -td "$BACKUP_BASE_DIR"/deployment-* 2>/dev/null | head -1)

    if [ -z "$BACKUP_DIR" ]; then
      echo "❌ Error: No previous deployments found in backups"
      echo "   Looking in: $BACKUP_BASE_DIR"
      exit 1
    fi
  else
    # Use specified backup
    BACKUP_DIR="${BACKUP_BASE_DIR}/${ROLLBACK_TO}"

    if [ ! -d "$BACKUP_DIR" ]; then
      echo "❌ Error: Specified backup not found: $BACKUP_DIR"
      exit 1
    fi
  fi

  echo "📦 Rollback source: $BACKUP_DIR"
  echo ""
}

# Display available backups
list_available_backups() {
  echo "📋 Available backups:"
  ls -lh "$BACKUP_BASE_DIR" | grep "^d" | awk '{print "   " $9 " (" $6 " " $7 " " $8 ")"}'
  echo ""
}

# Confirm rollback
confirm_rollback() {
  echo "⚠️  This will:"
  echo "   1. Stop all running containers"
  echo "   2. Restore configuration from backup"
  echo "   3. Restart containers with previous images"
  echo ""

  # In automated mode (non-interactive), skip confirmation
  if [ "${AUTOMATED_ROLLBACK:-false}" = "true" ]; then
    echo "🤖 Automated rollback - proceeding without confirmation"
    return 0
  fi

  read -p "Do you want to continue? (yes/no): " -r
  echo ""

  if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Rollback cancelled by user"
    exit 0
  fi
}

# Create backup of current state before rollback
backup_current_state() {
  echo "💾 Creating safety backup of current state..."
  SAFETY_BACKUP_DIR="${BACKUP_BASE_DIR}/rollback-safety-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$SAFETY_BACKUP_DIR"

  cp docker-compose.yml "$SAFETY_BACKUP_DIR/" 2>/dev/null || true
  cp .env "$SAFETY_BACKUP_DIR/" 2>/dev/null || true
  $COMPOSE_CMD ps --format json > "$SAFETY_BACKUP_DIR/containers.json" 2>/dev/null || true

  echo "✅ Safety backup created: $SAFETY_BACKUP_DIR"
  echo ""
}

# Stop current containers
stop_containers() {
  echo "🛑 Stopping current containers..."
  $COMPOSE_CMD down || {
    echo "⚠️  Warning: Some containers may not have stopped cleanly"
  }
  echo "✅ Containers stopped"
  echo ""
}

# Restore configuration from backup
restore_configuration() {
  echo "📥 Restoring configuration from backup..."

  # Restore docker-compose.yml if it exists in backup
  if [ -f "$BACKUP_DIR/docker-compose.yml" ]; then
    cp "$BACKUP_DIR/docker-compose.yml" ./docker-compose.yml
    echo "✅ Restored docker-compose.yml"
  else
    echo "⚠️  No docker-compose.yml in backup - keeping current"
  fi

  # Restore .env if it exists in backup
  if [ -f "$BACKUP_DIR/.env" ]; then
    cp "$BACKUP_DIR/.env" ./.env
    echo "✅ Restored .env"
  else
    echo "⚠️  No .env in backup - keeping current"
  fi

  echo ""
}

# Pull previous images
pull_previous_images() {
  echo "📥 Pulling previous container images..."

  # Extract image tags from backup if available
  if [ -f "$BACKUP_DIR/containers.json" ]; then
    echo "📋 Using image references from backup..."
    # This will use whatever images are specified in the restored docker-compose.yml
  fi

  # Pull images
  $COMPOSE_CMD pull --quiet || {
    echo "⚠️  Warning: Some images may not have pulled successfully"
    echo "   This may be expected if using local builds"
  }

  echo "✅ Images ready"
  echo ""
}

# Restart containers
restart_containers() {
  echo "🔄 Starting containers..."

  $COMPOSE_CMD up -d

  EXIT_CODE=$?
  if [ $EXIT_CODE -ne 0 ]; then
    echo "❌ Error: Failed to start containers (exit code: $EXIT_CODE)"
    echo "   Manual intervention may be required"
    exit $EXIT_CODE
  fi

  echo "✅ Containers started"
  echo ""
}

# Verify rollback success
verify_rollback() {
  echo "🔍 Verifying rollback..."
  echo ""

  sleep 10  # Give containers time to start

  # Check container status
  echo "📊 Container Status:"
  $COMPOSE_CMD ps
  echo ""

  # Count running containers
  RUNNING_COUNT=$($COMPOSE_CMD ps --filter "status=running" --format json 2>/dev/null | wc -l || echo "0")

  if [ "$RUNNING_COUNT" -ge 4 ]; then
    echo "✅ Rollback appears successful - $RUNNING_COUNT containers running"
  else
    echo "⚠️  Warning: Only $RUNNING_COUNT containers running - expected at least 4"
    echo "   Check logs for issues"
  fi

  echo ""
}

# Display rollback summary
show_summary() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ Rollback Complete"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 Restored from: $(basename "$BACKUP_DIR")"
  echo "💾 Safety backup: $(basename "$SAFETY_BACKUP_DIR")"
  echo "⏰ Completed: $(date)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Next steps:"
  echo "1. Monitor container logs: docker-compose logs -f"
  echo "2. Run health checks: ./scripts/deployment/health-check.sh"
  echo "3. If rollback failed, restore from: $SAFETY_BACKUP_DIR"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Main rollback flow
main() {
  list_available_backups
  find_backup
  confirm_rollback
  backup_current_state
  stop_containers
  restore_configuration
  pull_previous_images
  restart_containers
  verify_rollback
  show_summary
}

# Execute rollback
main
