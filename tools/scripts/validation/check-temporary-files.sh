#!/bin/bash
# tools/scripts/validation/check-temporary-files.sh
#
# PURPOSE: Check for committed temporary files that should be gitignored
# USAGE: ./check-temporary-files.sh
# AUTHOR: Repository Cleanup Automation
# CREATED: 2025-09-16
# UPDATED: 2025-09-16

set -euo pipefail  # Strict error handling

echo "🔍 Checking for temporary files..."

TEMP_PATTERNS=(
  "*.tmp"
  "*.temp"
  "*.cache"
  "*.log"
  "*.bak"
  "*.backup"
  "*~"
  ".DS_Store"
  "Thumbs.db"
  "*.tsbuildinfo"
)

violations_found=false

for pattern in "${TEMP_PATTERNS[@]}"; do
  # Find files matching the pattern, excluding node_modules, .git, and other common ignore paths
  while IFS= read -r -d '' file; do
    echo "❌ Found temporary file that should be gitignored: $file"
    echo "   Add pattern '$pattern' to .gitignore and remove this file"
    violations_found=true
  done < <(find . -name "$pattern" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*" -print0 2>/dev/null)
done

# Check for log directories
while IFS= read -r -d '' dir; do
  echo "❌ Found log directory that should be gitignored: $dir"
  echo "   Add 'logs/' to .gitignore and remove this directory"
  violations_found=true
done < <(find . -name "logs" -type d -not -path "*/node_modules/*" -not -path "*/.git/*" -print0 2>/dev/null)

# Check for common IDE temp directories
IDE_TEMP_DIRS=(
  ".vscode/settings.json.bak"
  ".idea/workspace.xml"
  "*.swp"
  "*.swo"
)

for pattern in "${IDE_TEMP_DIRS[@]}"; do
  while IFS= read -r -d '' file; do
    echo "❌ Found IDE temporary file: $file"
    echo "   Add appropriate IDE patterns to .gitignore"
    violations_found=true
  done < <(find . -name "$pattern" -not -path "*/node_modules/*" -not -path "*/.git/*" -print0 2>/dev/null)
done

if [[ "$violations_found" == true ]]; then
  echo ""
  echo "❌ Temporary file violations found!"
  echo "📖 See docs/development/agentic-style-guide.md for temporary file policies"
  echo "🔧 Add appropriate patterns to .gitignore and remove these files"
  exit 1
fi

echo "✅ Temporary files check passed"