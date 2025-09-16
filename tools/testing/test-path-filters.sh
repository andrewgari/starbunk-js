#!/bin/bash

# Path Filter Testing Script
# Tests the path filtering logic with various scenarios

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_test() {
    echo -e "${YELLOW}🧪 Testing: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Test scenarios
test_scenarios=(
    # Scenario 1: BunkBot source change
    "apps/bunkbot/src/index.ts|Expected: bunkbot only"

    # Scenario 2: Shared package change
    "packages/shared/src/logger.ts|Expected: ALL containers"

    # Scenario 3: Test file change
    "apps/bunkbot/src/__tests__/bot.test.ts|Expected: tests only, no builds"

    # Scenario 4: Root package.json change
    "package.json|Expected: ALL containers (critical infrastructure)"

    # Scenario 5: Documentation change
    "README.md|Expected: NO builds (docs only)"

    # Scenario 6: Workflow change
    ".github/workflows/pr-validation.yml|Expected: ALL containers (infrastructure)"

    # Scenario 7: Multiple container changes
    "apps/bunkbot/src/bot.ts apps/djcova/src/music.ts|Expected: bunkbot, djcova"

    # Scenario 8: Mixed changes (source + tests)
    "apps/bunkbot/src/index.ts apps/bunkbot/__tests__/bot.test.ts|Expected: bunkbot build + tests"

    # Scenario 9: Docker compose change
    "docker-compose.yml|Expected: ALL containers"

    # Scenario 10: TypeScript config change
    "tsconfig.json|Expected: ALL containers"
)

print_header "PATH FILTER VALIDATION TESTS"

# Helper function to simulate path filter matching
simulate_path_filter() {
    local file_path="$1"
    local filter_type="$2"

    case "$filter_type" in
        "shared-src")
            if [[ "$file_path" =~ ^packages/shared/src/ ]] || \
               [[ "$file_path" =~ ^packages/shared/package\.json$ ]]; then
                return 0
            fi
            ;;
        "bunkbot")
            if [[ "$file_path" =~ ^apps/bunkbot/ ]] && \
               [[ ! "$file_path" =~ \.test\. ]] && \
               [[ ! "$file_path" =~ __tests__ ]]; then
                return 0
            fi
            ;;
        "djcova")
            if [[ "$file_path" =~ ^apps/djcova/ ]] && \
               [[ ! "$file_path" =~ \.test\. ]] && \
               [[ ! "$file_path" =~ __tests__ ]]; then
                return 0
            fi
            ;;
        "critical-infrastructure")
            if [[ "$file_path" =~ ^package\.json$ ]] || \
               [[ "$file_path" =~ ^tsconfig\.json$ ]] || \
               [[ "$file_path" =~ ^docker-compose.*\.yml$ ]] || \
               [[ "$file_path" =~ ^\.github/workflows/ ]]; then
                return 0
            fi
            ;;
        "tests-only")
            if [[ "$file_path" =~ \.test\. ]] || \
               [[ "$file_path" =~ __tests__ ]] || \
               [[ "$file_path" =~ /tests/ ]]; then
                return 0
            fi
            ;;
        "docs-only")
            if [[ "$file_path" =~ \.md$ ]] || \
               [[ "$file_path" =~ ^docs/ ]]; then
                return 0
            fi
            ;;
    esac
    return 1
}

# Function to determine what should be built based on changed files
determine_builds() {
    local files=($1)
    local builds=()
    local tests_only=false
    local docs_only=false

    # Check each file
    for file in "${files[@]}"; do
        if simulate_path_filter "$file" "shared-src"; then
            builds=("shared" "bunkbot" "djcova" "starbunk-dnd" "covabot")
            break
        elif simulate_path_filter "$file" "critical-infrastructure"; then
            builds=("shared" "bunkbot" "djcova" "starbunk-dnd" "covabot")
            break
        elif simulate_path_filter "$file" "bunkbot"; then
            [[ ! " ${builds[*]} " =~ " bunkbot " ]] && builds+=("bunkbot")
        elif simulate_path_filter "$file" "djcova"; then
            [[ ! " ${builds[*]} " =~ " djcova " ]] && builds+=("djcova")
        elif simulate_path_filter "$file" "tests-only"; then
            tests_only=true
        elif simulate_path_filter "$file" "docs-only"; then
            docs_only=true
        fi
    done

    # Determine final action
    if [[ ${#builds[@]} -gt 0 ]]; then
        echo "BUILDS: ${builds[*]}"
    elif [[ "$tests_only" == true ]]; then
        echo "TESTS_ONLY"
    elif [[ "$docs_only" == true ]]; then
        echo "DOCS_ONLY"
    else
        echo "UNKNOWN"
    fi
}

# Run test scenarios
total_tests=${#test_scenarios[@]}
passed_tests=0

for i in "${!test_scenarios[@]}"; do
    IFS='|' read -r files_str expected <<< "${test_scenarios[$i]}"

    print_test "Scenario $((i+1)): $files_str"
    echo "  Expected: $expected"

    # Determine what should be built
    result=$(determine_builds "$files_str")
    echo "  Result: $result"

    # Simple validation (would need more sophisticated matching in real implementation)
    if [[ "$expected" =~ "ALL containers" && "$result" =~ "bunkbot djcova starbunk-dnd covabot" ]] || \
       [[ "$expected" =~ "bunkbot only" && "$result" =~ "BUILDS: bunkbot" ]] || \
       [[ "$expected" =~ "tests only" && "$result" =~ "TESTS_ONLY" ]] || \
       [[ "$expected" =~ "docs only" && "$result" =~ "DOCS_ONLY" ]] || \
       [[ "$expected" =~ "bunkbot, djcova" && "$result" =~ "bunkbot" && "$result" =~ "djcova" ]]; then
        print_success "Test $((i+1)) passed"
        ((passed_tests++))
    else
        print_error "Test $((i+1)) failed"
    fi
    echo ""
done

# Summary
print_header "PATH FILTER TEST RESULTS"
echo -e "${GREEN}✅ Passed: $passed_tests/$total_tests${NC}"

if [[ $passed_tests -eq $total_tests ]]; then
    print_success "All path filter tests passed!"
    exit 0
else
    failed_tests=$((total_tests - passed_tests))
    print_error "$failed_tests tests failed"
    exit 1
fi