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
  # 1) Tracked files matching the pattern (always a violation)
  while IFS= read -r -d '' file; do
    echo "❌ Tracked temporary file: $file"
    echo "   Remove from git and add pattern '$pattern' to .gitignore if appropriate"
    violations_found=true
  done < <(git ls-files -z -- "$pattern")

  # 2) Untracked but NOT ignored files matching the pattern (likely should be ignored)
  while IFS= read -r -d '' file; do
    case "$file" in */node_modules/*|*/.git/*|*/dist/*|*/build/*) continue;; esac
    echo "❌ Unignored temporary file: $file"
    echo "   Consider adding pattern '$pattern' to .gitignore"
    violations_found=true
  done < <(git ls-files -z -o --exclude-standard -- "$pattern")

done

# Check for log directories (tracked or unignored)
while IFS= read -r -d '' dir; do
  echo "❌ Tracked log directory: $dir"
  echo "   Remove from git and add 'logs/' to .gitignore"
  violations_found=true
done < <(git ls-files -z -- 'logs/**')

while IFS= read -r -d '' dir; do
  case "$dir" in */node_modules/*|*/.git/*) continue;; esac
  echo "❌ Unignored log directory: $dir"
  echo "   Add 'logs/' to .gitignore"
  violations_found=true
# List untracked, unignored directories named logs
done < <(git ls-files -z -o --exclude-standard --directory -- '**/logs')

# Check for common IDE temp directories
IDE_TEMP_DIRS=(
  ".vscode/settings.json.bak"
  ".idea/workspace.xml"
  "*.swp"
  "*.swo"
)

for pattern in "${IDE_TEMP_DIRS[@]}"; do
  # Tracked IDE temp files
  while IFS= read -r -d '' file; do
    echo "❌ Tracked IDE temporary file: $file"
    echo "   Consider ignoring IDE-specific files"
    violations_found=true
  done < <(git ls-files -z -- "$pattern")

  # Untracked but unignored IDE temp files
  while IFS= read -r -d '' file; do
    case "$file" in */node_modules/*|*/.git/*) continue;; esac
    echo "❌ Unignored IDE temporary file: $file"
    echo "   Add appropriate patterns to .gitignore"
    violations_found=true
  done < <(git ls-files -z -o --exclude-standard -- "$pattern")

done

if [[ "$violations_found" == true ]]; then
  echo ""
  echo "❌ Temporary file violations found!"
  echo "📖 See docs/development/agentic-style-guide.md for temporary file policies"
  echo "🔧 Add appropriate patterns to .gitignore and remove these files"
  exit 1
fi

echo "✅ Temporary files check passed"
