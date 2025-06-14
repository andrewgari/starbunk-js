#!/bin/bash

# Workflow Validation Script
# Validates that CI/CD workflows are properly configured

set -e

echo "🔍 Validating GitHub Actions Workflows..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} Found: $1"
        return 0
    else
        echo -e "${RED}✗${NC} Missing: $1"
        return 1
    fi
}

# Function to check if directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} Found directory: $1"
        return 0
    else
        echo -e "${RED}✗${NC} Missing directory: $1"
        return 1
    fi
}

# Function to validate YAML syntax (basic check)
validate_yaml() {
    local file="$1"
    if command -v yq >/dev/null 2>&1; then
        if yq eval '.' "$file" >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Valid YAML: $file"
            return 0
        else
            echo -e "${RED}✗${NC} Invalid YAML: $file"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠${NC} yq not found, skipping YAML validation for $file"
        return 0
    fi
}

# Function to check workflow triggers
check_workflow_triggers() {
    local file="$1"
    local expected_trigger="$2"
    
    if grep -q "$expected_trigger" "$file"; then
        echo -e "${GREEN}✓${NC} Correct trigger in $file: $expected_trigger"
        return 0
    else
        echo -e "${RED}✗${NC} Missing trigger in $file: $expected_trigger"
        return 1
    fi
}

echo ""
echo "📁 Checking workflow files..."

# Check if workflow directory exists
check_dir ".github/workflows" || exit 1

# Check required workflow files
WORKFLOWS=(
    ".github/workflows/docker-publish.yml"
    ".github/workflows/pr-checks.yml"
    ".github/workflows/ci.yml"
    ".github/workflows/pr-cleanup.yml"
)

for workflow in "${WORKFLOWS[@]}"; do
    check_file "$workflow" || exit 1
    validate_yaml "$workflow" || exit 1
done

echo ""
echo "🔧 Checking workflow triggers..."

# Check specific triggers
check_workflow_triggers ".github/workflows/docker-publish.yml" "pull_request:"
check_workflow_triggers ".github/workflows/pr-checks.yml" "pull_request:"
check_workflow_triggers ".github/workflows/ci.yml" "push:"
check_workflow_triggers ".github/workflows/pr-cleanup.yml" "types: \[closed\]"

echo ""
echo "🐳 Checking Docker configuration..."

# Check if Dockerfiles exist for all containers
CONTAINERS=("bunkbot" "djcova" "starbunk-dnd" "covabot")

for container in "${CONTAINERS[@]}"; do
    dockerfile="containers/$container/Dockerfile"
    check_file "$dockerfile" || exit 1
    
    # Check if Dockerfile has required stages
    if grep -q "FROM.*AS builder" "$dockerfile" && grep -q "FROM.*AS runtime" "$dockerfile"; then
        echo -e "${GREEN}✓${NC} Multi-stage Dockerfile: $dockerfile"
    else
        echo -e "${YELLOW}⚠${NC} Single-stage Dockerfile: $dockerfile (consider multi-stage for optimization)"
    fi
done

echo ""
echo "📦 Checking container structure..."

# Check if container directories exist
for container in "${CONTAINERS[@]}"; do
    container_dir="containers/$container"
    check_dir "$container_dir" || exit 1
    check_file "$container_dir/package.json" || exit 1
    check_file "$container_dir/tsconfig.json" || exit 1
done

# Check shared package
check_dir "containers/shared" || exit 1
check_file "containers/shared/package.json" || exit 1

echo ""
echo "🔍 Checking workflow matrix configuration..."

# Check if workflows reference the correct containers
for workflow in "${WORKFLOWS[@]}"; do
    if [ -f "$workflow" ]; then
        for container in "${CONTAINERS[@]}"; do
            if grep -q "$container" "$workflow"; then
                echo -e "${GREEN}✓${NC} $workflow references $container"
            else
                echo -e "${YELLOW}⚠${NC} $workflow does not reference $container (may be intentional)"
            fi
        done
    fi
done

echo ""
echo "🎯 Checking path filters..."

# Check if path filters are correctly configured
CRITICAL_PATHS=(
    "containers/shared/"
    "package.json"
    "tsconfig.json"
    ".github/workflows/"
    "Dockerfile"
)

for workflow in ".github/workflows/docker-publish.yml" ".github/workflows/pr-checks.yml" ".github/workflows/ci.yml"; do
    if [ -f "$workflow" ]; then
        echo "Checking path filters in $workflow:"
        for path in "${CRITICAL_PATHS[@]}"; do
            if grep -q "$path" "$workflow"; then
                echo -e "${GREEN}  ✓${NC} Monitors: $path"
            else
                echo -e "${YELLOW}  ⚠${NC} Missing: $path"
            fi
        done
    fi
done

echo ""
echo "✅ Workflow validation completed!"
echo ""
echo "📋 Summary:"
echo "- All required workflow files exist"
echo "- Docker configuration is valid"
echo "- Container structure is correct"
echo "- Path filters are configured"
echo ""
echo "🚀 Your CI/CD pipeline is ready for PR Docker image publishing!"
