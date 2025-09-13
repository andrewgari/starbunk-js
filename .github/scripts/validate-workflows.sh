#!/bin/bash
#
# GHCR Workflow Validation Script
#
# Comprehensive validation script for the GHCR image lifecycle management system.
# Validates configuration files, workflow syntax, and system integrity.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_FILE="$REPO_ROOT/.github/ghcr-cleanup-config.yml"
UTILS_SCRIPT="$REPO_ROOT/.github/scripts/ghcr-cleanup-utils.js"

# Validation results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_CHECKS++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNINGS++))
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((FAILED_CHECKS++))
}

# Increment check counter
check() {
    ((TOTAL_CHECKS++))
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate YAML syntax
validate_yaml() {
    local file="$1"
    local name="$2"

    check

    if [[ ! -f "$file" ]]; then
        log_error "$name not found: $file"
        return 1
    fi

    # Try multiple YAML validation methods
    local validation_success=false

    # Method 1: Python with PyYAML
    if command_exists python3; then
        if python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
            validation_success=true
        fi
    fi

    # Method 2: yq if available
    if [[ "$validation_success" = false ]] && command_exists yq; then
        if yq eval '.' "$file" >/dev/null 2>&1; then
            validation_success=true
        fi
    fi

    # Method 3: yamllint if available
    if [[ "$validation_success" = false ]] && command_exists yamllint; then
        if yamllint "$file" >/dev/null 2>&1; then
            validation_success=true
        fi
    fi

    if [[ "$validation_success" = true ]]; then
        log_success "$name YAML syntax is valid"
        return 0
    else
        log_error "$name has invalid YAML syntax"
        return 1
    fi
}

# Validate workflow file
validate_workflow() {
    local workflow_file="$1"
    local workflow_name="$2"

    check

    if [[ ! -f "$workflow_file" ]]; then
        log_error "Workflow not found: $workflow_file"
        return 1
    fi

    # Basic workflow validation
    if ! validate_yaml "$workflow_file" "$workflow_name workflow"; then
        return 1
    fi

    # Check for required workflow elements
    local has_name=false
    local has_on=false
    local has_jobs=false

    while IFS= read -r line; do
        if [[ "$line" =~ ^name: ]]; then
            has_name=true
        elif [[ "$line" =~ ^on: ]]; then
            has_on=true
        elif [[ "$line" =~ ^jobs: ]]; then
            has_jobs=true
        fi
    done < "$workflow_file"

    local workflow_valid=true

    if [[ "$has_name" = false ]]; then
        log_error "$workflow_name workflow missing 'name' field"
        workflow_valid=false
    fi

    if [[ "$has_on" = false ]]; then
        log_error "$workflow_name workflow missing 'on' field"
        workflow_valid=false
    fi

    if [[ "$has_jobs" = false ]]; then
        log_error "$workflow_name workflow missing 'jobs' field"
        workflow_valid=false
    fi

    if [[ "$workflow_valid" = true ]]; then
        log_success "$workflow_name workflow structure is valid"
        return 0
    else
        return 1
    fi
}

# Validate JavaScript file
validate_javascript() {
    local js_file="$1"
    local js_name="$2"

    check

    if [[ ! -f "$js_file" ]]; then
        log_error "$js_name not found: $js_file"
        return 1
    fi

    # Check if Node.js is available for validation
    if command_exists node; then
        if node -c "$js_file" 2>/dev/null; then
            log_success "$js_name JavaScript syntax is valid"
            return 0
        else
            log_error "$js_name has invalid JavaScript syntax"
            return 1
        fi
    else
        log_warning "Node.js not available - skipping JavaScript syntax validation for $js_name"
        return 0
    fi
}

# Validate configuration structure
validate_config_structure() {
    local config_file="$1"

    check

    if [[ ! -f "$config_file" ]]; then
        log_error "Configuration file not found: $config_file"
        return 1
    fi

    local validation_errors=0

    # Check for required sections
    if ! grep -q "^containers:" "$config_file"; then
        log_error "Configuration missing 'containers' section"
        ((validation_errors++))
    fi

    if ! grep -q "^safety:" "$config_file"; then
        log_warning "Configuration missing 'safety' section (recommended)"
    fi

    if ! grep -q "^monitoring:" "$config_file"; then
        log_warning "Configuration missing 'monitoring' section (recommended)"
    fi

    # Check for required container fields
    if grep -q "^containers:" "$config_file"; then
        local in_containers=false
        while IFS= read -r line; do
            if [[ "$line" =~ ^containers: ]]; then
                in_containers=true
                continue
            elif [[ "$line" =~ ^[a-zA-Z] ]] && [[ "$in_containers" = true ]]; then
                in_containers=false
            fi

            if [[ "$in_containers" = true ]] && [[ "$line" =~ ^[[:space:]]*-[[:space:]]*name: ]]; then
                # Found a container entry
                local container_name
                container_name=$(echo "$line" | sed 's/^[[:space:]]*-[[:space:]]*name:[[:space:]]*//')

                # Validate container name
                if [[ -z "$container_name" ]]; then
                    log_error "Container with empty name found"
                    ((validation_errors++))
                fi
            fi
        done < "$config_file"
    fi

    if [[ $validation_errors -eq 0 ]]; then
        log_success "Configuration structure is valid"
        return 0
    else
        log_error "Configuration structure has $validation_errors error(s)"
        return 1
    fi
}

# Check file permissions
check_file_permissions() {
    local file="$1"
    local name="$2"
    local expected_executable="$3"

    check

    if [[ ! -f "$file" ]]; then
        log_error "$name not found: $file"
        return 1
    fi

    if [[ "$expected_executable" = true ]]; then
        if [[ -x "$file" ]]; then
            log_success "$name is executable"
            return 0
        else
            log_warning "$name is not executable (this may be intentional)"
            return 0
        fi
    else
        if [[ ! -x "$file" ]]; then
            log_success "$name has correct permissions"
            return 0
        else
            log_warning "$name is executable (this may not be necessary)"
            return 0
        fi
    fi
}

# Validate dependencies
check_dependencies() {
    log_info "Checking system dependencies"

    local missing_deps=()
    local optional_deps=()

    # Required dependencies
    if ! command_exists node; then
        missing_deps+=("nodejs")
    else
        check
        log_success "Node.js is available ($(node --version))"
    fi

    # Optional but recommended dependencies
    if ! command_exists python3; then
        optional_deps+=("python3")
    else
        check
        if python3 -c "import yaml" 2>/dev/null; then
            log_success "Python3 with PyYAML is available"
        else
            optional_deps+=("python3-yaml")
        fi
    fi

    if ! command_exists yq; then
        optional_deps+=("yq")
    else
        check
        log_success "yq is available"
    fi

    if ! command_exists yamllint; then
        optional_deps+=("yamllint")
    else
        check
        log_success "yamllint is available"
    fi

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_info "Install with: sudo apt-get install ${missing_deps[*]}"
        return 1
    fi

    if [[ ${#optional_deps[@]} -gt 0 ]]; then
        log_warning "Optional dependencies not available: ${optional_deps[*]}"
        log_info "Install with: sudo apt-get install ${optional_deps[*]}"
    fi

    return 0
}

# Validate workflow integration
check_workflow_integration() {
    log_info "Checking workflow integration"

    local lifecycle_workflow="$REPO_ROOT/.github/workflows/ghcr-lifecycle-management.yml"
    local monitoring_workflow="$REPO_ROOT/.github/workflows/ghcr-monitoring.yml"

    check
    if [[ -f "$lifecycle_workflow" ]] && [[ -f "$monitoring_workflow" ]]; then
        log_success "Both main workflows are present"
    else
        log_error "Main workflows are missing"
        return 1
    fi

    # Check if workflows reference the correct files
    check
    if grep -q "CONFIG_FILE.*ghcr-cleanup-config.yml" "$lifecycle_workflow" 2>/dev/null; then
        log_success "Lifecycle workflow references configuration file correctly"
    else
        log_error "Lifecycle workflow missing or incorrect configuration file reference"
    fi

    check
    if grep -q "UTILS_SCRIPT.*ghcr-cleanup-utils.js" "$lifecycle_workflow" 2>/dev/null; then
        log_success "Lifecycle workflow references utilities script correctly"
    else
        log_error "Lifecycle workflow missing or incorrect utilities script reference"
    fi

    return 0
}

# Check for potential security issues
security_check() {
    log_info "Performing security checks"

    local security_issues=0

    # Check for hardcoded tokens or secrets
    check
    if grep -r -i "token.*=" "$REPO_ROOT/.github/" --include="*.yml" --include="*.yaml" --include="*.js" | grep -v "secrets.GITHUB_TOKEN" | grep -v "github-token.*secrets" >/dev/null 2>&1; then
        log_error "Potential hardcoded tokens found in workflow files"
        ((security_issues++))
    else
        log_success "No hardcoded tokens detected"
    fi

    # Check for proper secret usage
    check
    if grep -r "secrets\.GITHUB_TOKEN" "$REPO_ROOT/.github/workflows/" --include="*.yml" >/dev/null 2>&1; then
        log_success "Workflows properly use GitHub token from secrets"
    else
        log_warning "No GitHub token usage found (may be intentional)"
    fi

    # Check file permissions for scripts
    if [[ -f "$UTILS_SCRIPT" ]]; then
        check
        if [[ "$(stat -c %a "$UTILS_SCRIPT")" =~ ^[67] ]]; then
            log_warning "Utilities script has broad permissions"
        else
            log_success "Utilities script has appropriate permissions"
        fi
    fi

    return $security_issues
}

# Generate validation report
generate_report() {
    echo
    log_info "Validation Summary"
    echo "=================="
    echo "Total Checks: $TOTAL_CHECKS"
    echo "Passed: $PASSED_CHECKS"
    echo "Failed: $FAILED_CHECKS"
    echo "Warnings: $WARNINGS"
    echo

    if [[ $FAILED_CHECKS -eq 0 ]]; then
        log_success "All critical validations passed!"
        if [[ $WARNINGS -gt 0 ]]; then
            log_warning "$WARNINGS warning(s) found - review recommended"
        fi
        return 0
    else
        log_error "$FAILED_CHECKS critical validation(s) failed!"
        return 1
    fi
}

# Main validation function
main() {
    log_info "Starting workflow and configuration validation"

    # Change to repo root
    cd "$REPO_ROOT"

    # Check dependencies first
    if ! check_dependencies; then
        log_error "Dependency check failed - some validations may be skipped"
    fi

    # Validate core files
    validate_yaml "$CONFIG_FILE" "Configuration file"
    validate_javascript "$UTILS_SCRIPT" "Utilities script"

    # Validate workflows
    validate_workflow "$REPO_ROOT/.github/workflows/ghcr-lifecycle-management.yml" "Lifecycle management"
    validate_workflow "$REPO_ROOT/.github/workflows/ghcr-monitoring.yml" "Health monitoring"

    # Validate configuration structure
    validate_config_structure "$CONFIG_FILE"

    # Check file permissions
    check_file_permissions "$CONFIG_FILE" "Configuration file" false
    check_file_permissions "$UTILS_SCRIPT" "Utilities script" false
    check_file_permissions "$0" "Validation script" true

    # Check workflow integration
    check_workflow_integration

    # Security checks
    security_check

    # Generate final report
    generate_report
}

# Run main function
main "$@"