#!/bin/bash
# tools/scripts/validation/run-all-validations.sh
#
# PURPOSE: Run all repository structure validation checks
# USAGE: ./run-all-validations.sh [--fix] [--verbose]
# AUTHOR: Repository Cleanup Automation
# CREATED: 2025-09-16
# UPDATED: 2025-09-16

set -euo pipefail  # Strict error handling

# Change to repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../" && pwd)"
cd "$REPO_ROOT"

# Parse arguments
FIX_MODE=false
VERBOSE=false

for arg in "$@"; do
  case $arg in
    --fix)
      FIX_MODE=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    *)
      echo "Usage: $0 [--fix] [--verbose]"
      echo "  --fix     Attempt to automatically fix violations where possible"
      echo "  --verbose Show detailed output"
      exit 1
      ;;
  esac
done

echo "🔍 Running repository structure validation checks..."
echo "Repository: $REPO_ROOT"
echo ""

# Track validation results
validation_results=()
overall_status=0

# Function to run a validation check
run_validation() {
  local check_name="$1"
  local script_path="$2"
  local description="$3"

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔍 $check_name: $description"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [[ -f "$script_path" ]]; then
    if bash "$script_path"; then
      echo "✅ $check_name passed"
      validation_results+=("✅ $check_name: PASSED")
    else
      echo "❌ $check_name failed"
      validation_results+=("❌ $check_name: FAILED")
      overall_status=1
    fi
  else
    echo "⚠️  Validation script not found: $script_path"
    validation_results+=("⚠️  $check_name: SCRIPT_MISSING")
  fi
  echo ""
}

# Run all validation checks
run_validation "Root Directory Compliance" "tools/scripts/validation/check-root-directory.sh" "Validate root directory contains only essential files"
run_validation "File Naming Conventions" "tools/scripts/validation/check-naming-conventions.sh" "Check file naming follows style guide conventions"
run_validation "Temporary Files Check" "tools/scripts/validation/check-temporary-files.sh" "Ensure no temporary files are committed"
run_validation "Documentation Structure" "tools/scripts/validation/check-documentation-structure.sh" "Validate documentation organization"

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 VALIDATION SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
for result in "${validation_results[@]}"; do
  echo "$result"
done
echo ""

if [[ $overall_status -eq 0 ]]; then
  echo "🎉 All repository structure validations passed!"
  echo "🏗️  Repository structure complies with agentic style guide"
else
  echo "💥 Some repository structure validations failed!"
  echo "📖 See docs/development/agentic-style-guide.md for guidelines"
  echo "🔧 Run individual validation scripts for detailed error messages"

  if [[ "$FIX_MODE" == true ]]; then
    echo ""
    echo "🔧 Fix mode requested but automatic fixes not yet implemented"
    echo "   Manual intervention required for violations found"
  fi
fi

echo ""
echo "📅 Validation completed at: $(date)"
exit $overall_status