#!/bin/bash
# Sync versions from per-app VERSION files into the corresponding package.json files.
#
# Usage:
#   bash scripts/sync-versions.sh              # sync all apps
#   bash scripts/sync-versions.sh bunkbot      # sync only bunkbot
#
# Each app's authoritative version lives in src/<app>/VERSION.
# The root VERSION file is kept in sync with the highest app version for
# tooling that still reads it.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ALL_APPS=(bluebot bunkbot covabot djcova shared)

# If a specific app was passed, only process that one.
if [[ -n "$1" ]]; then
  TARGET_APPS=("$1")
else
  TARGET_APPS=("${ALL_APPS[@]}")
fi

update_package_version() {
  local PACKAGE_FILE="$1"
  local NEW_VERSION="$2"

  if [[ ! -f "$PACKAGE_FILE" ]]; then
    echo -e "${YELLOW}⚠️  Skipping: $PACKAGE_FILE (not found)${NC}"
    return
  fi

  local CURRENT_VERSION
  CURRENT_VERSION=$(node -p "require('./${PACKAGE_FILE}').version" 2>/dev/null || echo "unknown")

  if [[ "$CURRENT_VERSION" == "$NEW_VERSION" ]]; then
    echo -e "✓ $PACKAGE_FILE (already ${NEW_VERSION})"
    return
  fi

  if ! node -e "
    const fs = require('fs');
    const d = JSON.parse(fs.readFileSync('${PACKAGE_FILE}', 'utf8'));
    d.version = '${NEW_VERSION}';
    fs.writeFileSync('${PACKAGE_FILE}', JSON.stringify(d, null, 2) + '\\n');
  "; then
    echo -e "${RED}✗ Failed to update $PACKAGE_FILE${NC}"
    return 1
  fi

  echo -e "${GREEN}✓ Updated $PACKAGE_FILE${NC} (${CURRENT_VERSION} → ${NEW_VERSION})"
}

HIGHEST_VERSION="0.0.0"

for APP in "${TARGET_APPS[@]}"; do
  VERSION_FILE="src/${APP}/VERSION"

  if [[ ! -f "$VERSION_FILE" ]]; then
    echo -e "${YELLOW}⚠️  No VERSION file for ${APP} — skipping${NC}"
    continue
  fi

  APP_VERSION=$(cat "$VERSION_FILE" | tr -d '[:space:]')

  if [[ ! "$APP_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}Error: invalid semver in ${VERSION_FILE}: ${APP_VERSION}${NC}"
    exit 1
  fi

  echo -e "${GREEN}📦 Syncing ${APP} → ${YELLOW}${APP_VERSION}${NC}"
  update_package_version "src/${APP}/package.json" "$APP_VERSION"

  # Track highest version for root VERSION file
  if [[ "$(printf '%s\n' "$HIGHEST_VERSION" "$APP_VERSION" | sort -V | tail -1)" == "$APP_VERSION" ]]; then
    HIGHEST_VERSION="$APP_VERSION"
  fi
done

# Keep root package.json and VERSION in sync with the highest app version
# (legacy tooling may still read these)
if [[ "$1" == "" ]]; then
  echo ""
  echo "Syncing root package.json to highest version: ${HIGHEST_VERSION}"
  update_package_version "package.json" "$HIGHEST_VERSION"
  echo "$HIGHEST_VERSION" > VERSION
fi

echo ""
echo -e "${GREEN}✅ Version sync complete${NC}"
