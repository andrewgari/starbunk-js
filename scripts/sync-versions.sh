#!/bin/bash
# Sync version from root package.json to all workspace packages
# This ensures we have a single source of truth for versioning

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Get version from root package.json
if [ ! -f "package.json" ]; then
  echo -e "${RED}Error: Root package.json not found${NC}"
  exit 1
fi

ROOT_VERSION=$(node -p "require('./package.json').version" 2>/dev/null)

if [ -z "$ROOT_VERSION" ]; then
  echo -e "${RED}Error: Could not read version from root package.json${NC}"
  exit 1
fi

echo -e "${GREEN}📦 Syncing version ${YELLOW}${ROOT_VERSION}${GREEN} from root to all packages...${NC}"
echo ""

# Function to update version in a package.json file
update_package_version() {
  local package_file=$1
  local package_dir=$(dirname "$package_file")
  
  if [ ! -f "$package_file" ]; then
    echo -e "${YELLOW}⚠️  Skipping: $package_file (not found)${NC}"
    return
  fi
  
  # Get current version
  local current_version=$(node -p "require('./$package_file').version" 2>/dev/null || echo "unknown")
  
  if [ "$current_version" = "$ROOT_VERSION" ]; then
    echo -e "✓ $package_file (already ${ROOT_VERSION})"
    return
  fi
  
  # Update version using npm version (no git tag)
  cd "$package_dir"
  npm version "$ROOT_VERSION" --no-git-tag-version --allow-same-version > /dev/null 2>&1
  cd "$ROOT_DIR"
  
  echo -e "${GREEN}✓ Updated $package_file${NC} (${current_version} → ${ROOT_VERSION})"
}

# Update all app packages
echo "Updating app packages..."
for app in apps/*/package.json; do
  if [ -f "$app" ]; then
    update_package_version "$app"
  fi
done

echo ""

# Update shared package
echo "Updating shared package..."
if [ -f "packages/shared/package.json" ]; then
  update_package_version "packages/shared/package.json"
fi

echo ""
echo -e "${GREEN}✅ Version sync complete! All packages are now at version ${YELLOW}${ROOT_VERSION}${NC}"

