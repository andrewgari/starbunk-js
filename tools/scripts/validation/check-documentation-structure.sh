#!/bin/bash
# tools/scripts/validation/check-documentation-structure.sh
#
# PURPOSE: Validate documentation organization and structure
# USAGE: ./check-documentation-structure.sh
# AUTHOR: Repository Cleanup Automation
# CREATED: 2025-09-16
# UPDATED: 2025-09-16

set -euo pipefail  # Strict error handling

echo "🔍 Checking documentation structure..."

violations_found=false

# Check for documentation files in root that should be in docs/
echo "Checking for misplaced documentation files..."
while IFS= read -r -d '' file; do
  basename_file=$(basename "$file")
  # Allow README.md and CLAUDE.md in root, and allow the migration plan temporarily
  if [[ "$basename_file" != "README.md" ]] && [[ "$basename_file" != "CLAUDE.md" ]] && [[ "$basename_file" != "REPOSITORY_MIGRATION_PLAN.md" ]]; then
    echo "❌ Documentation file should be in docs/ directory: $file"
    echo "   Move to appropriate docs/ subdirectory (development/, deployment/, architecture/, etc.)"
    violations_found=true
  fi
done < <(find . -maxdepth 1 -name "*.md" -print0)

# Check for proper docs directory structure
if [[ -d "docs" ]]; then
  echo "Checking docs/ directory structure..."

  # Ensure key subdirectories exist
  REQUIRED_DOCS_DIRS=(
    "docs/development"
    "docs/deployment"
    "docs/architecture"
  )

  for dir in "${REQUIRED_DOCS_DIRS[@]}"; do
    if [[ ! -d "$dir" ]]; then
      echo "⚠️  Missing recommended documentation directory: $dir"
      echo "   Consider creating this directory for better organization"
    fi
  done

  # Check for documentation files without proper headers
  echo "Checking documentation file headers..."
  while IFS= read -r -d '' file; do
    if [[ -f "$file" ]]; then
      # Check if file has a proper title (starts with #)
      if ! head -n 5 "$file" | grep -q "^#"; then
        echo "⚠️  Documentation file missing title header: $file"
        echo "   Add a proper markdown title (# Title) at the beginning"
      fi
    fi
  done < <(find docs -name "*.md" -print0 2>/dev/null)
fi

# Check for README files in subdirectories that might be better as proper docs
echo "Checking for scattered README files..."
while IFS= read -r -d '' file; do
  dir_name=$(dirname "$file")
  if [[ "$dir_name" != "." ]] && [[ "$dir_name" != "./apps/"* ]] && [[ "$dir_name" != "./packages/"* ]]; then
    echo "ℹ️  Consider consolidating into main documentation: $file"
    echo "   Move content to appropriate docs/ subdirectory if it's general documentation"
  fi
done < <(find . -name "README.md" -not -path "*/node_modules/*" -not -path "*/.git/*" -print0)

if [[ "$violations_found" == true ]]; then
  echo ""
  echo "❌ Documentation structure violations found!"
  echo "📖 See docs/development/agentic-style-guide.md for documentation organization rules"
  exit 1
fi

echo "✅ Documentation structure check passed"