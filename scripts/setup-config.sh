#!/usr/bin/env bash
set -euo pipefail

# Setup script for copying example configs to local config directory
# Usage: npm run setup:config

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔧 Setting up local config directory..."

# Check if config/ already exists
if [ -d "$REPO_ROOT/config" ]; then
  read -p "⚠️  config/ directory already exists. Overwrite? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Setup cancelled."
    exit 1
  fi
  echo "🗑️  Removing existing config/..."
  rm -rf "$REPO_ROOT/config"
fi

# Copy examples to config
echo "📋 Copying examples/config/ to config/..."
cp -r "$REPO_ROOT/examples/config" "$REPO_ROOT/config"

# Remove the README from config (not needed locally)
rm -f "$REPO_ROOT/config/README.md"

echo ""
echo "✅ Config setup complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Edit config files in config/ directory"
echo "  2. Add your credentials and settings"
echo "  3. Never commit config/ (it's git-ignored)"
echo ""
echo "See docs/DEPLOYMENT.md for more details."
