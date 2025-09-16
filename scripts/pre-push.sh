#!/bin/bash

# Starbunk Pre-Push Validation Script
# This script implements intelligent, selective validation that only tests containers affected by changes
# It provides comprehensive validation while optimizing for speed in common scenarios

set -euo pipefail

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly REMOTE="${1:-origin}"
readonly URL="${2:-}"

# Colors and formatting
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color
readonly BOLD='\033[1m'
readonly DIM='\033[2m'

# Icons
readonly INFO="ℹ️"
readonly SUCCESS="✅"
readonly WARNING="⚠️"
readonly ERROR="❌"
readonly BUILDING="🏗️"
readonly TESTING="🧪"
readonly LINTING="🎨"
readonly TYPECHECK="🔍"

# Performance tracking
START_TIME=$(date +%s)

# Helper functions
log_info() {
    echo -e "${BLUE}${INFO}  $1${NC}"
}

log_success() {
    echo -e "${GREEN}${SUCCESS} $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}${WARNING}  $1${NC}"
}

log_error() {
    echo -e "${RED}${ERROR} $1${NC}"
}

log_header() {
    echo
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}  $1${NC}"
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_section() {
    echo
    echo -e "${BOLD}$1${NC}"
}

format_time() {
    local duration=$1
    if [ $duration -lt 60 ]; then
        echo "${duration}s"
    else
        echo "$(($duration / 60))m $(($duration % 60))s"
    fi
}

# Get remote information
get_remote_info() {
    local remote_url
    remote_url=$(git remote get-url "$REMOTE" 2>/dev/null || echo "unknown")
    echo "$remote_url"
}

# Analyze changes since last push
analyze_changes() {
    local changed_files
    local merge_base

    # Find the merge base with remote branch
    merge_base=$(git merge-base HEAD "$REMOTE/main" 2>/dev/null || git merge-base HEAD "$REMOTE/develop" 2>/dev/null || echo "HEAD~1")

    # Get list of changed files
    changed_files=$(git diff --name-only "$merge_base" HEAD 2>/dev/null || git diff --name-only HEAD~1 HEAD)

    echo "$changed_files"
}

# Map changed files to affected containers
get_affected_containers() {
    local changed_files="$1"
    local containers=()
    local shared_changed=false
    local infrastructure_changed=false

    # Check if shared package changed
    if echo "$changed_files" | grep -q "^packages/shared/"; then
        shared_changed=true
        log_warning "Shared package changed - validating all containers" >&2
    fi

    # Check if critical infrastructure changed
    if echo "$changed_files" | grep -qE "^(package\.json|package-lock\.json|tsconfig\.json|docker-compose.*\.yml|\.github/|scripts/)"; then
        infrastructure_changed=true
        log_warning "Critical infrastructure changed - validating all containers" >&2
    fi

    # If shared or infrastructure changed, validate all containers
    if [ "$shared_changed" = true ] || [ "$infrastructure_changed" = true ]; then
        containers=("shared" "bunkbot" "djcova" "starbunk-dnd" "covabot")
    else
        # Check individual container changes
        if echo "$changed_files" | grep -q "^packages/shared/"; then
            containers+=("shared")
        fi
        if echo "$changed_files" | grep -q "^apps/bunkbot/"; then
            containers+=("bunkbot")
        fi
        if echo "$changed_files" | grep -q "^apps/djcova/"; then
            containers+=("djcova")
        fi
        if echo "$changed_files" | grep -q "^apps/starbunk-dnd/"; then
            containers+=("starbunk-dnd")
        fi
        if echo "$changed_files" | grep -q "^apps/covabot/"; then
            containers+=("covabot")
        fi
    fi

    # If no specific containers changed but there are changes, validate shared at minimum
    if [ ${#containers[@]} -eq 0 ] && [ -n "$changed_files" ]; then
        containers=("shared")
    fi

    printf "%s\n" "${containers[@]}"
}

# Validate a single container
validate_container() {
    local container="$1"
    local step_start_time
    local step_duration

    echo
    log_info "[${container}] Starting validation..."

    # Navigate to container directory (shared is in packages/, others in apps/)
    if [ "$container" = "shared" ]; then
        cd "$PROJECT_ROOT/packages/$container" || {
            log_error "[${container}] Directory not found"
            return 1
        }
    else
        cd "$PROJECT_ROOT/apps/$container" || {
            log_error "[${container}] Directory not found"
            return 1
        }
    fi

    # Step 1: Build
    log_info "[${container}] ${BUILDING} Building..."
    step_start_time=$(date +%s)
    if ! npm run build >/dev/null 2>&1; then
        log_error "[${container}] Build failed"
        npm run build # Show errors
        return 1
    fi
    step_duration=$(( $(date +%s) - step_start_time ))
    log_success "[${container}] Building completed ($(format_time $step_duration))"

    # Step 2: Type checking
    log_info "[${container}] ${TYPECHECK} Type checking..."
    step_start_time=$(date +%s)
    if ! npm run type-check >/dev/null 2>&1; then
        log_error "[${container}] Type checking failed"
        npm run type-check # Show errors
        return 1
    fi
    step_duration=$(( $(date +%s) - step_start_time ))
    log_success "[${container}] Type checking completed ($(format_time $step_duration))"

    # Step 3: Linting
    log_info "[${container}] ${LINTING} Linting..."
    step_start_time=$(date +%s)

    # Check if container has its own lint script, otherwise use root lint
    if npm run --silent lint >/dev/null 2>&1; then
        if ! npm run lint >/dev/null 2>&1; then
            log_error "[${container}] Linting failed"
            npm run lint # Show errors
            return 1
        fi
    else
        # Fall back to root lint for this container
        cd "$PROJECT_ROOT"
        if [ "$container" = "shared" ]; then
            if ! npx eslint "packages/${container}/src/**/*.ts" --format=compact >/dev/null 2>&1; then
                log_error "[${container}] Linting failed (using root eslint)"
                npx eslint "packages/${container}/src/**/*.ts" --format=compact # Show errors
                cd "$PROJECT_ROOT/packages/$container"
                return 1
            fi
            cd "$PROJECT_ROOT/packages/$container"
        else
            if ! npx eslint "apps/${container}/src/**/*.ts" --format=compact >/dev/null 2>&1; then
                log_error "[${container}] Linting failed (using root eslint)"
                npx eslint "apps/${container}/src/**/*.ts" --format=compact # Show errors
                cd "$PROJECT_ROOT/apps/$container"
                return 1
            fi
            cd "$PROJECT_ROOT/apps/$container"
        fi
    fi

    step_duration=$(( $(date +%s) - step_start_time ))
    log_success "[${container}] Linting completed ($(format_time $step_duration))"

    # Step 4: Testing
    log_info "[${container}] ${TESTING} Testing..."
    step_start_time=$(date +%s)
    if ! npm test >/dev/null 2>&1; then
        log_error "[${container}] Testing failed"
        npm test # Show errors
        return 1
    fi
    step_duration=$(( $(date +%s) - step_start_time ))
    log_success "[${container}] Testing completed ($(format_time $step_duration))"

    return 0
}

# Main execution
main() {
    cd "$PROJECT_ROOT"

    log_header "STARBUNK PRE-PUSH VALIDATION"

    # Display remote information
    local remote_url
    remote_url=$(get_remote_info)
    log_info "Remote: $REMOTE"
    log_info "URL: $remote_url"
    log_info "Analyzing changes since last push..."

    # Analyze changes
    local changed_files
    changed_files=$(analyze_changes)

    if [ -z "$changed_files" ]; then
        log_info "No changes detected since last push"
        log_success "Nothing to validate - proceeding with push"
        exit 0
    fi

    # Display changed files
    echo
    local file_count
    file_count=$(echo "$changed_files" | wc -l)
    log_info "Changed files ($file_count):"
    echo "$changed_files" | sed 's/^/  /'

    # Get affected containers
    local affected_containers
    affected_containers=($(get_affected_containers "$changed_files"))

    if [ ${#affected_containers[@]} -eq 0 ]; then
        log_info "No containers affected by changes"
        log_success "Nothing to validate - proceeding with push"
        exit 0
    fi

    echo
    log_info "Affected containers (${#affected_containers[@]}):"
    printf "  %s\n" "${affected_containers[@]}"

    # Validate each affected container
    local validation_failures=0
    local container_count=1
    local total_containers=${#affected_containers[@]}

    for container in "${affected_containers[@]}"; do
        echo
        echo "[${container_count}/${total_containers}] Validating ${container}"

        if ! validate_container "$container"; then
            validation_failures=$((validation_failures + 1))
        fi

        container_count=$((container_count + 1))
    done

    # Final results
    local total_duration
    total_duration=$(( $(date +%s) - START_TIME ))

    log_header "VALIDATION COMPLETE"

    if [ $validation_failures -eq 0 ]; then
        log_success "All validations passed!"
        log_info "Validated ${#affected_containers[@]} container(s) in $(format_time $total_duration)"
        log_success "Push proceeding..."
    else
        log_error "$validation_failures container(s) failed validation"
        log_info "Total validation time: $(format_time $total_duration)"
        log_error "Push aborted - fix issues and try again"
        exit 1
    fi
}

# Handle script interruption
cleanup() {
    echo
    log_warning "Validation interrupted"
    exit 130
}

trap cleanup SIGINT SIGTERM

# Run main function
main "$@"