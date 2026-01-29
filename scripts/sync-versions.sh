#!/bin/bash
# Sync version from VERSION file to all workspace packages
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

# Get version from VERSION file
if [ ! -f "config/VERSION" ]; then
  echo -e "${RED}Error: config/VERSION file not found${NC}"
  exit 1
fi

ROOT_VERSION=$(cat config/VERSION | tr -d '[:space:]')

if [ -z "$ROOT_VERSION" ]; then
  echo -e "${RED}Error: Could not read version from VERSION file${NC}"
  exit 1
fi

# Validate version format (basic semver: MAJOR.MINOR.PATCH)
if [[ ! "$ROOT_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo -e "${RED}Error: Invalid version format in VERSION file: ${ROOT_VERSION}${NC}"
  exit 1
fi

echo -e "${GREEN}📦 Syncing version ${YELLOW}${ROOT_VERSION}${GREEN} from VERSION file to all packages...${NC}"
echo ""

# Function to update version in a package.json file
update_package_version() {
  local package_file=$1

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

  # Update version without touching lockfiles
  if ! node - "$package_file" "$ROOT_VERSION" <<'NODE'
const fs = require('fs');
const [packageFile, version] = process.argv.slice(2);
try {
  const data = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  data.version = version;
  fs.writeFileSync(packageFile, JSON.stringify(data, null, 2) + '\n');
} catch (error) {
  console.error(error);
  process.exit(1);
}
NODE
  then
    echo -e "${RED}✗ Failed to update $package_file${NC}"
    return 1
  fi

  echo -e "${GREEN}✓ Updated $package_file${NC} (${current_version} → ${ROOT_VERSION})"
}

# Update root package.json
echo "Updating root package.json..."
if [ -f "package.json" ]; then
  update_package_version "package.json"
fi

echo ""

# Update all src packages (bluebot, bunkbot, covabot, djcova, shared)
echo "Updating src packages..."
for package_dir in src/bluebot src/bunkbot src/covabot src/djcova src/shared; do
  package_file="$package_dir/package.json"
  
  # Skip if package doesn't exist
  if [ ! -f "$package_file" ]; then
    echo -e "${YELLOW}⚠️  Skipping: $package_file (not found)${NC}"
    continue
  fi

  update_package_version "$package_file"
done

echo ""
echo -e "${GREEN}✅ Version sync complete! All packages are now at version ${YELLOW}${ROOT_VERSION}${NC}"

