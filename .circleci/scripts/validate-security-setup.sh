#!/bin/bash
# Validation script for Snyk security gating policy implementation
# This script verifies that all required components are in place

set -e

echo "🔍 Validating Snyk Security Gating Policy Implementation"
echo "=========================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅ Found: $1${NC}"
        return 0
    else
        echo -e "${RED}❌ Missing: $1${NC}"
        return 1
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✅ $1 contains: $2${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 missing: $2${NC}"
        return 1
    fi
}

ERRORS=0

echo "📁 Checking Required Files..."
echo "-----------------------------"
check_file ".circleci/workflows/security-pr-validation.yml" || ERRORS=$((ERRORS+1))
check_file ".github/workflows/security-rescan.yml" || ERRORS=$((ERRORS+1))
check_file "SECURITY.md" || ERRORS=$((ERRORS+1))
echo ""

echo "🔧 Checking CircleCI Configuration..."
echo "--------------------------------------"
check_content ".circleci/scripts/generate_config.py" "security-pr-validation" || ERRORS=$((ERRORS+1))
check_content ".circleci/workflows/security-pr-validation.yml" "snyk test" || ERRORS=$((ERRORS+1))
check_content ".circleci/workflows/security-pr-validation.yml" "snyk container test" || ERRORS=$((ERRORS+1))
check_content ".circleci/workflows/security-pr-validation.yml" "all-projects" || ERRORS=$((ERRORS+1))
check_content ".circleci/workflows/security-pr-validation.yml" "severity-threshold=high" || ERRORS=$((ERRORS+1))
echo ""

echo "📊 Checking Main Branch Monitoring..."
echo "--------------------------------------"
check_content ".circleci/main-merge.yml" "snyk_monitor_code" || ERRORS=$((ERRORS+1))
check_content ".circleci/main-merge.yml" "snyk monitor" || ERRORS=$((ERRORS+1))
check_content ".circleci/main-merge.yml" "snyk container monitor" || ERRORS=$((ERRORS+1))
echo ""

echo "🔄 Checking Rescan Workflow..."
echo "-------------------------------"
check_content ".github/workflows/security-rescan.yml" "workflow_dispatch" || ERRORS=$((ERRORS+1))
check_content ".github/workflows/security-rescan.yml" "snyk-to-html" || ERRORS=$((ERRORS+1))
echo ""

echo "📚 Checking Documentation..."
echo "-----------------------------"
check_content "README.md" "SECURITY.md" || ERRORS=$((ERRORS+1))
check_content "SECURITY.md" "snyk-to-html" || ERRORS=$((ERRORS+1))
check_content "SECURITY.md" "Rescan Loop" || ERRORS=$((ERRORS+1))
check_content "SECURITY.md" "SNYK_TOKEN" || ERRORS=$((ERRORS+1))
check_content ".gitignore" "!SECURITY.md" || ERRORS=$((ERRORS+1))
echo ""

echo "🐳 Checking Container Scans..."
echo "-------------------------------"
for app in bunkbot djcova covabot bluebot; do
    check_content ".circleci/workflows/security-pr-validation.yml" "snyk_container_scan_${app}" || ERRORS=$((ERRORS+1))
done
echo ""

echo "✅ Checking YAML Syntax..."
echo "---------------------------"
python3 -c "
import yaml
import sys

files = [
    '.circleci/workflows/security-pr-validation.yml',
    '.circleci/main-merge.yml',
    '.github/workflows/security-rescan.yml'
]

for f in files:
    try:
        with open(f, 'r') as file:
            yaml.safe_load(file)
        print(f'✅ {f} - Valid YAML')
    except yaml.YAMLError as e:
        print(f'❌ {f} - Invalid YAML: {e}')
        sys.exit(1)
" || ERRORS=$((ERRORS+1))
echo ""

echo "=========================================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Security gating policy is properly configured.${NC}"
    echo ""
    echo "Next Steps:"
    echo "1. Configure SNYK_TOKEN in CircleCI project settings"
    echo "2. Merge this PR to enable security gates"
    echo "3. Test by creating a test PR with a known vulnerability"
    exit 0
else
    echo -e "${RED}❌ Found $ERRORS error(s). Please fix the issues above.${NC}"
    exit 1
fi
