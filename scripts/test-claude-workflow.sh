#!/bin/bash

# Test script for Claude Container-Aware Code Review Workflow
# This script validates the workflow configuration and path-based filtering

set -e

echo "🧪 Testing Claude Container-Aware Code Review Workflow"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test functions
test_yaml_syntax() {
    echo -e "${BLUE}Testing YAML syntax...${NC}"
    if python3 -c "import yaml; yaml.safe_load(open('.github/workflows/claude-code-review.yml'))" 2>/dev/null; then
        echo -e "${GREEN}✅ YAML syntax is valid${NC}"
        return 0
    else
        echo -e "${RED}❌ YAML syntax error${NC}"
        return 1
    fi
}

test_path_filters() {
    echo -e "${BLUE}Testing path filter configuration...${NC}"
    
    if [ ! -f ".github/path-filters.yml" ]; then
        echo -e "${RED}❌ Path filters file not found${NC}"
        return 1
    fi
    
    # Check if all containers are defined in path filters
    containers=("bunkbot" "covabot" "djcova" "starbunk-dnd" "snowbunk" "shared")
    
    for container in "${containers[@]}"; do
        if grep -q "^${container}:" .github/path-filters.yml; then
            echo -e "${GREEN}✅ ${container} filter defined${NC}"
        else
            echo -e "${RED}❌ ${container} filter missing${NC}"
            return 1
        fi
    done
    
    return 0
}

test_container_structure() {
    echo -e "${BLUE}Testing container directory structure...${NC}"
    
    containers=("bunkbot" "covabot" "djcova" "starbunk-dnd" "snowbunk" "shared")
    
    for container in "${containers[@]}"; do
        if [ -d "containers/${container}" ]; then
            echo -e "${GREEN}✅ containers/${container}/ exists${NC}"
            
            # Check for package.json
            if [ -f "containers/${container}/package.json" ]; then
                echo -e "${GREEN}  ✅ package.json found${NC}"
            else
                echo -e "${YELLOW}  ⚠️ package.json missing${NC}"
            fi
            
            # Check for src directory
            if [ -d "containers/${container}/src" ]; then
                echo -e "${GREEN}  ✅ src/ directory found${NC}"
            else
                echo -e "${YELLOW}  ⚠️ src/ directory missing${NC}"
            fi
            
        else
            echo -e "${RED}❌ containers/${container}/ missing${NC}"
            return 1
        fi
    done
    
    return 0
}

test_workflow_triggers() {
    echo -e "${BLUE}Testing workflow trigger configuration...${NC}"
    
    # Check for required trigger events
    if grep -q "review_requested" .github/workflows/claude-code-review.yml; then
        echo -e "${GREEN}✅ review_requested trigger configured${NC}"
    else
        echo -e "${RED}❌ review_requested trigger missing${NC}"
        return 1
    fi
    
    if grep -q "synchronize" .github/workflows/claude-code-review.yml; then
        echo -e "${GREEN}✅ synchronize trigger configured${NC}"
    else
        echo -e "${RED}❌ synchronize trigger missing${NC}"
        return 1
    fi
    
    if grep -q "dismissed" .github/workflows/claude-code-review.yml; then
        echo -e "${GREEN}✅ dismissed trigger configured${NC}"
    else
        echo -e "${RED}❌ dismissed trigger missing${NC}"
        return 1
    fi
    
    return 0
}

test_container_specific_prompts() {
    echo -e "${BLUE}Testing container-specific prompts...${NC}"
    
    containers=("bunkbot" "covabot" "djcova" "starbunk-dnd" "snowbunk")
    
    for container in "${containers[@]}"; do
        if grep -q "${container}" .github/workflows/claude-code-review.yml; then
            echo -e "${GREEN}✅ ${container} prompt configuration found${NC}"
        else
            echo -e "${RED}❌ ${container} prompt configuration missing${NC}"
            return 1
        fi
    done
    
    return 0
}

test_security_checks() {
    echo -e "${BLUE}Testing security check configuration...${NC}"
    
    security_checks=(
        "Discord token security"
        "Environment variable validation"
        "Debug mode safety"
        "Input sanitization"
        "Rate limiting"
    )
    
    for check in "${security_checks[@]}"; do
        if grep -qi "${check}" .github/workflows/claude-code-review.yml; then
            echo -e "${GREEN}✅ ${check} mentioned in workflow${NC}"
        else
            echo -e "${YELLOW}⚠️ ${check} not explicitly mentioned${NC}"
        fi
    done
    
    return 0
}

test_ci_integration() {
    echo -e "${BLUE}Testing CI/CD integration...${NC}"
    
    # Check for CI status integration
    if grep -q "LINT_STATUS" .github/workflows/claude-code-review.yml; then
        echo -e "${GREEN}✅ Lint status integration configured${NC}"
    else
        echo -e "${RED}❌ Lint status integration missing${NC}"
        return 1
    fi
    
    if grep -q "TYPECHECK_STATUS" .github/workflows/claude-code-review.yml; then
        echo -e "${GREEN}✅ Type check status integration configured${NC}"
    else
        echo -e "${RED}❌ Type check status integration missing${NC}"
        return 1
    fi
    
    if grep -q "TEST_STATUS" .github/workflows/claude-code-review.yml; then
        echo -e "${GREEN}✅ Test status integration configured${NC}"
    else
        echo -e "${RED}❌ Test status integration missing${NC}"
        return 1
    fi
    
    return 0
}

test_error_handling() {
    echo -e "${BLUE}Testing error handling configuration...${NC}"
    
    # Check for timeout configuration
    if grep -q "timeout-minutes:" .github/workflows/claude-code-review.yml; then
        echo -e "${GREEN}✅ Timeout configuration found${NC}"
    else
        echo -e "${RED}❌ Timeout configuration missing${NC}"
        return 1
    fi
    
    # Check for retry logic
    if grep -q "continue-on-error:" .github/workflows/claude-code-review.yml; then
        echo -e "${GREEN}✅ Error continuation logic found${NC}"
    else
        echo -e "${YELLOW}⚠️ Error continuation logic not found${NC}"
    fi
    
    # Check for cleanup steps
    if grep -q "Cleanup" .github/workflows/claude-code-review.yml; then
        echo -e "${GREEN}✅ Cleanup steps configured${NC}"
    else
        echo -e "${YELLOW}⚠️ Cleanup steps not found${NC}"
    fi
    
    return 0
}

# Run all tests
echo -e "${BLUE}Starting workflow validation tests...${NC}"
echo ""

tests=(
    "test_yaml_syntax"
    "test_path_filters"
    "test_container_structure"
    "test_workflow_triggers"
    "test_container_specific_prompts"
    "test_security_checks"
    "test_ci_integration"
    "test_error_handling"
)

passed=0
total=${#tests[@]}

for test in "${tests[@]}"; do
    echo ""
    if $test; then
        ((passed++))
    fi
done

echo ""
echo "=================================================="
echo -e "${BLUE}Test Results Summary${NC}"
echo "=================================================="

if [ $passed -eq $total ]; then
    echo -e "${GREEN}✅ All tests passed! ($passed/$total)${NC}"
    echo -e "${GREEN}Claude workflow is ready for deployment.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. ($passed/$total passed)${NC}"
    echo -e "${YELLOW}Please review the failed tests above.${NC}"
    exit 1
fi
