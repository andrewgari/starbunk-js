#!/bin/bash
# tools/scripts/validation/check-naming-conventions-simple.sh
#
# PURPOSE: Check file naming conventions per agentic style guide (simplified)
# USAGE: ./check-naming-conventions-simple.sh
# AUTHOR: Repository Cleanup Automation
# CREATED: 2025-09-16
# UPDATED: 2025-09-16

set -euo pipefail  # Strict error handling

echo "🔍 Checking file naming conventions (simplified check)..."

violations_found=false

# Count TypeScript files with legacy naming (informational)
ts_legacy_count=0
if [[ -d "apps" ]] || [[ -d "packages" ]]; then
  ts_legacy_count=$(find apps packages -name "*.ts" -not -path "*/node_modules/*" -not -path "*/dist/*" 2>/dev/null | \
    while read -r file; do
      basename_file=$(basename "$file" .ts)
      if [[ ! "$basename_file" =~ \.(test|spec)$ ]] && [[ "$basename_file" != "index" ]]; then
        if [[ "$basename_file" =~ [A-Z] ]] || [[ "$basename_file" =~ _ ]]; then
          echo "$file"
        fi
      fi
    done | wc -l)

  if [[ $ts_legacy_count -gt 0 ]]; then
    echo "ℹ️  Found $ts_legacy_count TypeScript files with legacy naming (PascalCase/snake_case)"
    echo "   This is informational - future files should use camelCase per agentic style guide"
  else
    echo "✅ All TypeScript files follow camelCase naming"
  fi
fi

# Check for obvious violations in new script files
echo "Checking script file naming..."
script_violations=0
if [[ -d "tools" ]]; then
  while IFS= read -r file; do
    if [[ -n "$file" ]]; then
      basename_file=$(basename "$file")
      name_part="${basename_file%.*}"
      if [[ "$name_part" =~ [A-Z] ]] || [[ "$name_part" =~ _ ]]; then
        echo "❌ Script file should use kebab-case: $file"
        echo "   Example: validate-environment.sh, deploy-staging.py"
        violations_found=true
        ((script_violations++))
      fi
    fi
  done < <(find tools -name "*.sh" -o -name "*.py" -o -name "*.js" 2>/dev/null)

  if [[ $script_violations -eq 0 ]]; then
    echo "✅ All script files follow kebab-case naming"
  fi
fi

# Check obvious config violations (avoid data directory)
echo "Checking configuration file naming..."
config_violations=0
while IFS= read -r file; do
  if [[ -n "$file" && "$file" != *"/data/"* ]]; then
    basename_file=$(basename "$file")
    # Skip known good files
    if [[ "$basename_file" != "package.json" ]] && [[ "$basename_file" != "tsconfig.json" ]] && \
       [[ "$basename_file" != ".prettierrc.json" ]] && [[ "$basename_file" != ".eslintrc.json" ]]; then
      if [[ "$basename_file" =~ _ ]] && [[ "$basename_file" =~ [A-Z] ]]; then
        echo "❌ Configuration file should use kebab-case: $file"
        echo "   Example: docker-compose.yml, github-actions.yml"
        violations_found=true
        ((config_violations++))
      fi
    fi
  fi
done < <(find . -name "*.json" -o -name "*.yml" -o -name "*.yaml" 2>/dev/null | grep -v node_modules | grep -v .git)

if [[ $config_violations -eq 0 ]]; then
  echo "✅ Configuration files follow kebab-case naming"
fi

# Summary
if [[ "$violations_found" == true ]]; then
  echo ""
  echo "❌ File naming convention violations found!"
  echo "📖 See docs/development/agentic-style-guide.md for naming conventions"
  exit 1
fi

echo ""
echo "✅ File naming convention check passed (with legacy files noted)"
echo "📖 For complete guidelines, see docs/development/agentic-style-guide.md"