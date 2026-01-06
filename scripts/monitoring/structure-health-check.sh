#!/bin/bash
# tools/scripts/monitoring/structure-health-check.sh
#
# PURPOSE: Monitor repository structure health and generate metrics
# USAGE: ./structure-health-check.sh [--report-file output.txt] [--json]
# AUTHOR: Repository Cleanup Automation
# CREATED: 2025-09-16
# UPDATED: 2025-09-16

set -euo pipefail  # Strict error handling

# Change to repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../" && pwd)"
cd "$REPO_ROOT"

# Parse arguments
REPORT_FILE=""
JSON_OUTPUT=false

for arg in "$@"; do
  case $arg in
    --report-file=*)
      REPORT_FILE="${arg#*=}"
      shift
      ;;
    --json)
      JSON_OUTPUT=true
      shift
      ;;
    *)
      echo "Usage: $0 [--report-file=output.txt] [--json]"
      echo "  --report-file Save report to specified file"
      echo "  --json        Output in JSON format"
      exit 1
      ;;
  esac
done

# Redirect output to file if specified
if [[ -n "$REPORT_FILE" ]]; then
  exec > >(tee "$REPORT_FILE")
fi

if [[ "$JSON_OUTPUT" == true ]]; then
  # JSON output format
  echo "{"
  echo '  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",'
  echo '  "repository_path": "'$REPO_ROOT'",'

  # Count files in root directory
  root_files=$(find . -maxdepth 1 -type f | wc -l)
  echo '  "root_directory_files": '$root_files','

  # Directory sizes
  echo '  "directory_sizes": {'
  du -sh */ 2>/dev/null | sort -hr | head -10 | while read size dir; do
    dir_clean=$(echo "$dir" | sed 's/\/$//')
    echo "    \"$dir_clean\": \"$size\","
  done | sed '$ s/,$//'
  echo '  },'

  # Check for duplicate TypeScript files
  duplicate_count=$(find . -type f -name "*.ts" -not -path "*/node_modules/*" | xargs -I {} basename {} | sort | uniq -d | wc -l)
  echo '  "duplicate_typescript_files": '$duplicate_count','

  # Check for orphaned config files
  orphaned_count=$(find . -name "*.config.*" -not -path "*/node_modules/*" -not -path "*/.git/*" | while read config; do
    if [[ ! -f "$(dirname "$config")/package.json" ]]; then
      echo "$config"
    fi
  done | wc -l)
  echo '  "orphaned_config_files": '$orphaned_count

  echo "}"
else
  # Human-readable output format
  echo "📊 Repository Structure Health Check"
  echo "===================================="
  echo "Repository: $REPO_ROOT"
  echo "Timestamp: $(date)"
  echo ""

  # Count files in root directory
  root_files=$(find . -maxdepth 1 -type f | wc -l)
  echo "📁 Root directory files: $root_files (target: <15)"

  if [[ $root_files -lt 10 ]]; then
    echo "   ✅ Excellent - Root directory is clean"
  elif [[ $root_files -lt 15 ]]; then
    echo "   ⚠️  Good - Root directory is acceptable"
  else
    echo "   ❌ Action needed - Too many files in root directory"
  fi

  # Check for oversized directories
  echo ""
  echo "📊 Top 10 directory sizes:"
  du -sh */ 2>/dev/null | sort -hr | head -10 | while read size dir; do
    echo "   $size $dir"
  done

  # Check for duplicate TypeScript files
  echo ""
  echo "🔍 Checking for duplicate TypeScript file names..."
  duplicates_found=false
  find . -type f -name "*.ts" -not -path "*/node_modules/*" | \
    xargs -I {} basename {} | sort | uniq -d | \
    while read dup; do
      echo "⚠️  Duplicate file name: $dup"
      duplicates_found=true
    done

  if ! $duplicates_found; then
    echo "   ✅ No duplicate TypeScript file names found"
  fi

  # Check for orphaned configuration files
  echo ""
  echo "🔍 Checking for orphaned configuration files..."
  orphans_found=false
  find . -name "*.config.*" -not -path "*/node_modules/*" -not -path "*/.git/*" | \
    while read config; do
      if [[ ! -f "$(dirname "$config")/package.json" ]]; then
        echo "⚠️  Orphaned config file: $config"
        orphans_found=true
      fi
    done

  if ! $orphans_found; then
    echo "   ✅ No orphaned configuration files found"
  fi

  # Check container organization
  echo ""
  echo "🏗️  Container organization status:"
  for container in apps/*/; do
    if [[ -d "$container" ]]; then
      container_name=$(basename "$container")
      echo "   📦 $container_name:"

      # Check for required files
      required_files=("package.json" "tsconfig.json" "Dockerfile")
      for file in "${required_files[@]}"; do
        if [[ -f "$container$file" ]]; then
          echo "      ✅ $file"
        else
          echo "      ❌ Missing $file"
        fi
      done

      # Check for proper src structure
      if [[ -d "$container/src" ]]; then
        echo "      ✅ src/ directory"
      else
        echo "      ❌ Missing src/ directory"
      fi
    fi
  done

  # Overall health score
  echo ""
  echo "🏥 Overall Repository Health:"

  score=100

  # Deduct points for various issues
  if [[ $root_files -gt 15 ]]; then
    score=$((score - 20))
    echo "   -20: Too many root directory files ($root_files)"
  elif [[ $root_files -gt 10 ]]; then
    score=$((score - 10))
    echo "   -10: Root directory could be cleaner ($root_files files)"
  fi

  # Check validation status
  echo ""
  echo "🔍 Running quick validation checks..."
  validation_score=0

  if tools/scripts/validation/check-root-directory.sh >/dev/null 2>&1; then
    echo "   ✅ Root directory compliance: PASSED"
    validation_score=$((validation_score + 25))
  else
    echo "   ❌ Root directory compliance: FAILED"
    score=$((score - 15))
  fi

  if tools/scripts/validation/check-naming-conventions.sh >/dev/null 2>&1; then
    echo "   ✅ Naming conventions: PASSED"
    validation_score=$((validation_score + 25))
  else
    echo "   ❌ Naming conventions: FAILED"
    score=$((score - 10))
  fi

  if tools/scripts/validation/check-temporary-files.sh >/dev/null 2>&1; then
    echo "   ✅ Temporary files: PASSED"
    validation_score=$((validation_score + 25))
  else
    echo "   ❌ Temporary files: FAILED"
    score=$((score - 15))
  fi

  if tools/scripts/validation/check-documentation-structure.sh >/dev/null 2>&1; then
    echo "   ✅ Documentation structure: PASSED"
    validation_score=$((validation_score + 25))
  else
    echo "   ⚠️  Documentation structure: WARNINGS"
    score=$((score - 5))
  fi

  echo ""
  echo "🏆 Final Health Score: $score/100"

  if [[ $score -ge 90 ]]; then
    echo "   🟢 Excellent - Repository structure is in great shape!"
  elif [[ $score -ge 75 ]]; then
    echo "   🟡 Good - Minor improvements recommended"
  elif [[ $score -ge 60 ]]; then
    echo "   🟠 Fair - Several issues need attention"
  else
    echo "   🔴 Poor - Significant structural issues require immediate attention"
  fi
fi

echo ""
echo "✅ Structure health check completed"