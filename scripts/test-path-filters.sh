#!/bin/bash

# Path Filter Testing Script
# This script helps test path filters locally before committing changes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
COMPARE_BRANCH="main"
PATH_FILTERS_FILE=".github/path-filters.yml"
VERBOSE=false

# Function to print usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Test path filters against changed files"
    echo ""
    echo "OPTIONS:"
    echo "  -b, --branch BRANCH    Compare against branch (default: main)"
    echo "  -f, --filters FILE     Path to filters file (default: .github/path-filters.yml)"
    echo "  -v, --verbose          Verbose output"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "EXAMPLES:"
    echo "  $0                     # Test against main branch"
    echo "  $0 -b develop         # Test against develop branch"
    echo "  $0 -v                 # Verbose output"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--branch)
            COMPARE_BRANCH="$2"
            shift 2
            ;;
        -f|--filters)
            PATH_FILTERS_FILE="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if a file matches a pattern
matches_pattern() {
    local file=$1
    local pattern=$2
    
    # Handle negation patterns
    if [[ $pattern == !* ]]; then
        pattern=${pattern#!}
        if matches_simple_pattern "$file" "$pattern"; then
            return 1  # Negation match - exclude this file
        else
            return 0  # No negation match - include this file
        fi
    else
        matches_simple_pattern "$file" "$pattern"
    fi
}

# Function to match simple patterns
matches_simple_pattern() {
    local file=$1
    local pattern=$2
    
    # Convert glob pattern to regex-like matching
    if [[ $pattern == *"**"* ]]; then
        # Handle ** patterns
        local base_pattern=${pattern//\*\*/.*}
        if [[ $file =~ $base_pattern ]]; then
            return 0
        fi
    elif [[ $pattern == *"*"* ]]; then
        # Handle * patterns
        local base_pattern=${pattern//\*/[^/]*}
        if [[ $file =~ $base_pattern ]]; then
            return 0
        fi
    else
        # Exact match or substring match
        if [[ $file == *"$pattern"* ]]; then
            return 0
        fi
    fi
    
    return 1
}

# Function to test a filter against changed files
test_filter() {
    local filter_name=$1
    local changed_files=("${@:2}")
    
    if [ ! -f "$PATH_FILTERS_FILE" ]; then
        print_status $RED "❌ Path filters file not found: $PATH_FILTERS_FILE"
        exit 1
    fi
    
    # Extract patterns for this filter using awk
    local patterns=()
    while IFS= read -r line; do
        if [[ -n "$line" ]]; then
            patterns+=("$line")
        fi
    done < <(awk -v filter="$filter_name:" '
        $0 == filter { in_section = 1; next }
        /^[a-zA-Z]/ && in_section { in_section = 0 }
        in_section && /^  - / { 
            gsub(/^  - /, "")
            gsub(/^'\''|'\''$/, "")
            gsub(/^"|"$/, "")
            print 
        }
    ' "$PATH_FILTERS_FILE")
    
    if [ ${#patterns[@]} -eq 0 ]; then
        if [ "$VERBOSE" = true ]; then
            print_status $YELLOW "⚠️  No patterns found for filter: $filter_name"
        fi
        return 1
    fi
    
    # Test each changed file against patterns
    local matched_files=()
    local excluded_files=()
    
    for file in "${changed_files[@]}"; do
        local file_matches=false
        local file_excluded=false
        
        for pattern in "${patterns[@]}"; do
            if [[ $pattern == !* ]]; then
                # Exclusion pattern
                local clean_pattern=${pattern#!}
                if matches_simple_pattern "$file" "$clean_pattern"; then
                    file_excluded=true
                    excluded_files+=("$file")
                    break
                fi
            else
                # Inclusion pattern
                if matches_simple_pattern "$file" "$pattern"; then
                    file_matches=true
                fi
            fi
        done
        
        if [ "$file_matches" = true ] && [ "$file_excluded" = false ]; then
            matched_files+=("$file")
        fi
    done
    
    # Report results
    if [ ${#matched_files[@]} -gt 0 ]; then
        print_status $GREEN "✅ $filter_name: TRIGGERED (${#matched_files[@]} files)"
        if [ "$VERBOSE" = true ]; then
            for file in "${matched_files[@]}"; do
                echo "    📄 $file"
            done
        fi
        return 0
    else
        print_status $BLUE "⏭️  $filter_name: SKIPPED"
        if [ "$VERBOSE" = true ] && [ ${#excluded_files[@]} -gt 0 ]; then
            echo "    Excluded files:"
            for file in "${excluded_files[@]}"; do
                echo "    🚫 $file"
            done
        fi
        return 1
    fi
}

# Main execution
main() {
    print_status $BLUE "🔍 Testing Path Filters"
    echo "Compare branch: $COMPARE_BRANCH"
    echo "Filters file: $PATH_FILTERS_FILE"
    echo ""
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_status $RED "❌ Not in a git repository"
        exit 1
    fi
    
    # Check if compare branch exists
    if ! git rev-parse --verify "$COMPARE_BRANCH" > /dev/null 2>&1; then
        print_status $RED "❌ Branch '$COMPARE_BRANCH' not found"
        exit 1
    fi
    
    # Get changed files
    local changed_files=()
    while IFS= read -r file; do
        if [[ -n "$file" ]]; then
            changed_files+=("$file")
        fi
    done < <(git diff --name-only "$COMPARE_BRANCH"...HEAD)
    
    if [ ${#changed_files[@]} -eq 0 ]; then
        print_status $YELLOW "⚠️  No changed files found compared to $COMPARE_BRANCH"
        exit 0
    fi
    
    print_status $BLUE "📋 Changed files (${#changed_files[@]}):"
    for file in "${changed_files[@]}"; do
        echo "  📄 $file"
    done
    echo ""
    
    # Test each filter
    local filters=("shared" "bunkbot" "djcova" "starbunk-dnd" "covabot" "root-files" "workflows" "docker")
    local triggered_filters=()
    local total_containers=4
    
    print_status $BLUE "🧪 Testing Filters:"
    for filter in "${filters[@]}"; do
        if test_filter "$filter" "${changed_files[@]}"; then
            triggered_filters+=("$filter")
        fi
    done
    
    echo ""
    
    # Calculate optimization
    local containers_to_build=0
    
    # Check if shared or critical files changed (affects all containers)
    if [[ " ${triggered_filters[@]} " =~ " shared " ]] || \
       [[ " ${triggered_filters[@]} " =~ " root-files " ]] || \
       [[ " ${triggered_filters[@]} " =~ " workflows " ]] || \
       [[ " ${triggered_filters[@]} " =~ " docker " ]]; then
        containers_to_build=4
        print_status $YELLOW "🔄 Shared/critical files changed - all containers will be built"
    else
        # Count individual container triggers
        for filter in "bunkbot" "djcova" "starbunk-dnd" "covabot"; do
            if [[ " ${triggered_filters[@]} " =~ " $filter " ]]; then
                containers_to_build=$((containers_to_build + 1))
            fi
        done
    fi
    
    local saved_builds=$((total_containers - containers_to_build))
    local optimization_rate=$(( (saved_builds * 100) / total_containers ))
    
    print_status $BLUE "📊 Build Optimization Results:"
    echo "  🐳 Containers to build: $containers_to_build out of $total_containers"
    echo "  💾 Builds saved: $saved_builds"
    echo "  ⚡ Optimization rate: ${optimization_rate}%"
    echo "  ⏱️  Estimated time saved: ~$((saved_builds * 3)) minutes"
    
    if [ $optimization_rate -gt 75 ]; then
        print_status $GREEN "🎉 Excellent optimization!"
    elif [ $optimization_rate -gt 50 ]; then
        print_status $GREEN "✅ Good optimization"
    elif [ $optimization_rate -gt 25 ]; then
        print_status $YELLOW "⚠️  Moderate optimization"
    else
        print_status $YELLOW "🔍 Low optimization - consider reviewing path filters"
    fi
    
    echo ""
    print_status $BLUE "🏗️  Containers that will be built:"
    if [ $containers_to_build -eq 4 ]; then
        echo "  🔨 All containers (shared/critical changes detected)"
    else
        for filter in "bunkbot" "djcova" "starbunk-dnd" "covabot"; do
            if [[ " ${triggered_filters[@]} " =~ " $filter " ]]; then
                echo "  🔨 $filter"
            else
                echo "  ⏭️  $filter (skipped)"
            fi
        done
    fi
}

# Run main function
main "$@"
