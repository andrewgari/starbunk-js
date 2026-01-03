#!/bin/bash
# tools/scripts/validation/check-root-directory.sh
#
# PURPOSE: Validate root directory compliance with agentic style guide
# USAGE: ./check-root-directory.sh
# AUTHOR: Repository Cleanup Automation
# CREATED: 2025-09-16
# UPDATED: 2025-09-16

set -euo pipefail  # Strict error handling

FORBIDDEN_PATTERNS=(
  "*.tmp"
  "*.temp"
  "*.log"
  "*.cache"
  "dist/"
  "build/"
  "*.tsbuildinfo"
)

ALLOWED_FILES=(
  "package.json"
  "package-lock.json"
  "tsconfig.json"
  "jest.config.js"
  ".eslintrc.json"
  ".prettierrc.json"
  ".gitignore"
  ".dockerignore"
  ".editorconfig"
  "README.md"
  "CLAUDE.md"
  "REPOSITORY_MIGRATION_PLAN.md"
  "docker-compose*.yml"
  "podman-compose*.yml"
  ".env"
  "VERSION"
)

echo "🔍 Checking root directory compliance..."

# Check for forbidden patterns
for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  if ls $pattern 2>/dev/null; then
    echo "❌ Found forbidden files in root: $pattern"
    exit 1
  fi
done

# Check for unexpected files
for file in *; do
  if [[ -f "$file" ]]; then
    allowed=false
    for allowed_file in "${ALLOWED_FILES[@]}"; do
      # Handle glob patterns for allowed files
      if [[ "$file" == $allowed_file ]]; then
        allowed=true
        break
      fi
    done

    if [[ "$allowed" == false ]]; then
      echo "❌ Unexpected file in root directory: $file"
      echo "   Move to appropriate subdirectory per docs/development/agentic-style-guide.md"
      echo "   Suggested locations:"
      case "$file" in
        *.sh) echo "     → tools/scripts/" ;;
        *.py) echo "     → tools/scripts/" ;;
        *.js) echo "     → tools/scripts/" ;;
        *.md) echo "     → docs/" ;;
        *.yml) echo "     → infrastructure/ or config/" ;;
        *.json) echo "     → config/" ;;
        *) echo "     → Check agentic style guide for appropriate location" ;;
      esac
      exit 1
    fi
  fi
done

echo "✅ Root directory compliance check passed"