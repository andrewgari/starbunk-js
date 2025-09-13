#!/bin/bash

# Security Review Script for CI/CD System
# Reviews permissions, token usage, and security configurations

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_check() {
    echo -e "${YELLOW}🔍 Checking: $1${NC}"
}

print_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
}

print_warn() {
    echo -e "${YELLOW}⚠️  WARN: $1${NC}"
}

print_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  INFO: $1${NC}"
}

# Security findings counters
CRITICAL_ISSUES=0
HIGH_ISSUES=0
MEDIUM_ISSUES=0
LOW_ISSUES=0
PASSES=0

# Helper function to check workflow permissions
check_workflow_permissions() {
    local workflow_file="$1"
    local workflow_name=$(basename "$workflow_file")

    print_check "Permissions in $workflow_name"

    # Check if permissions are explicitly defined
    if grep -q "^permissions:" "$workflow_file"; then
        print_pass "Explicit permissions defined"
        ((PASSES++))

        # Check for excessive permissions
        if grep -A 10 "^permissions:" "$workflow_file" | grep -q "write-all\|contents: write" && \
           ! grep -A 10 "^permissions:" "$workflow_file" | grep -q "packages: write"; then
            print_warn "Potentially excessive permissions detected"
            ((MEDIUM_ISSUES++))
        fi
    else
        print_warn "No explicit permissions defined - using defaults"
        ((MEDIUM_ISSUES++))
    fi

    # Check for secure token usage
    if grep -q "secrets\.GITHUB_TOKEN\|\${{ secrets\.GITHUB_TOKEN }}" "$workflow_file"; then
        print_pass "Using GITHUB_TOKEN (standard practice)"
        ((PASSES++))
    fi

    # Check for hardcoded secrets or tokens
    if grep -qE "(password|token|key|secret).*=.*['\"][^'\$]" "$workflow_file"; then
        print_fail "Potential hardcoded secrets detected"
        ((CRITICAL_ISSUES++))
    else
        print_pass "No hardcoded secrets detected"
        ((PASSES++))
    fi

    # Check for secure Docker practices
    if grep -q "docker.*build\|docker.*push" "$workflow_file"; then
        if grep -q "docker/login-action" "$workflow_file"; then
            print_pass "Using official Docker login action"
            ((PASSES++))
        else
            print_warn "Docker operations without official login action"
            ((LOW_ISSUES++))
        fi

        # Check for provenance and SBOM settings
        if grep -q "provenance: false\|sbom: false" "$workflow_file"; then
            print_warn "Provenance/SBOM disabled - consider security implications"
            ((LOW_ISSUES++))
        fi
    fi
}

# Check for insecure workflow triggers
check_workflow_triggers() {
    local workflow_file="$1"
    local workflow_name=$(basename "$workflow_file")

    print_check "Triggers in $workflow_name"

    # Check for pull_request_target (dangerous)
    if grep -q "pull_request_target:" "$workflow_file"; then
        print_fail "pull_request_target trigger detected - high security risk"
        ((CRITICAL_ISSUES++))
    else
        print_pass "No dangerous pull_request_target trigger"
        ((PASSES++))
    fi

    # Check for workflow_run without proper branch restrictions
    if grep -q "workflow_run:" "$workflow_file"; then
        if grep -A 5 "workflow_run:" "$workflow_file" | grep -q "branches:"; then
            print_pass "workflow_run trigger has branch restrictions"
            ((PASSES++))
        else
            print_warn "workflow_run trigger without branch restrictions"
            ((MEDIUM_ISSUES++))
        fi
    fi

    # Check for unrestricted workflow_dispatch
    if grep -q "workflow_dispatch:" "$workflow_file"; then
        print_info "Manual workflow dispatch enabled (review inputs for security)"
    fi
}

# Check Docker security practices
check_docker_security() {
    local dockerfile="$1"
    local container_name=$(basename "$(dirname "$dockerfile")")

    print_check "Docker security in $container_name"

    if [ -f "$dockerfile" ]; then
        # Check for non-root user
        if grep -q "USER [^r].*\|USER [0-9]" "$dockerfile"; then
            print_pass "Non-root user specified"
            ((PASSES++))
        else
            print_warn "No non-root user specified - running as root"
            ((HIGH_ISSUES++))
        fi

        # Check for COPY with appropriate permissions
        if grep -q "COPY.*--chown=" "$dockerfile"; then
            print_pass "COPY uses explicit ownership"
            ((PASSES++))
        fi

        # Check for health checks
        if grep -q "HEALTHCHECK" "$dockerfile"; then
            print_pass "Health check defined"
            ((PASSES++))
        else
            print_info "No health check defined (not critical but recommended)"
        fi

        # Check for exposed ports documentation
        if grep -q "EXPOSE" "$dockerfile"; then
            print_pass "Exposed ports documented"
            ((PASSES++))
        fi

        # Check for secrets in build args
        if grep -qE "(password|token|key|secret)" "$dockerfile"; then
            print_warn "Potential secrets in Dockerfile - review carefully"
            ((MEDIUM_ISSUES++))
        fi
    else
        print_warn "Dockerfile not found: $dockerfile"
    fi
}

# Check environment security
check_environment_security() {
    print_check "Environment and secret management"

    # Check for .env files that might be committed
    if find . -name ".env*" -not -path "./node_modules/*" -not -path "./.git/*" | grep -q "."; then
        print_warn "Environment files found - ensure they're properly ignored"
        ((MEDIUM_ISSUES++))

        find . -name ".env*" -not -path "./node_modules/*" -not -path "./.git/*" | while read -r env_file; do
            echo "    Found: $env_file"
        done
    else
        print_pass "No environment files found in repository"
        ((PASSES++))
    fi

    # Check gitignore for common secrets
    if [ -f ".gitignore" ]; then
        if grep -qE "\.env|\.key|\.pem|\.p12|config\.json|secrets" .gitignore; then
            print_pass ".gitignore includes common secret patterns"
            ((PASSES++))
        else
            print_warn ".gitignore might not cover all secret file patterns"
            ((LOW_ISSUES++))
        fi
    else
        print_warn "No .gitignore file found"
        ((LOW_ISSUES++))
    fi
}

# Check dependency security
check_dependency_security() {
    print_check "Dependency security"

    # Check for npm audit
    if [ -f "package.json" ]; then
        # We'll just check if audit scripts exist rather than running it
        if grep -q "audit" package.json; then
            print_pass "Audit scripts found in package.json"
            ((PASSES++))
        else
            print_info "No explicit audit scripts - recommend adding npm audit to CI"
        fi

        # Check for lock file
        if [ -f "package-lock.json" ]; then
            print_pass "Package lock file present"
            ((PASSES++))
        else
            print_warn "No package-lock.json - dependency versions not locked"
            ((HIGH_ISSUES++))
        fi
    fi

    # Check for Dependabot configuration
    if [ -f ".github/dependabot.yml" ]; then
        print_pass "Dependabot configuration found"
        ((PASSES++))
    else
        print_info "No Dependabot configuration - consider adding for automated security updates"
    fi
}

# Check access control and branch protection
check_access_control() {
    print_check "Access control and branch protection"

    # Check for branch protection indicators in workflows
    if grep -r "github\.ref == 'refs/heads/main'\|github\.ref_name == 'main'" .github/workflows/ >/dev/null 2>&1; then
        print_pass "Main branch protection patterns found in workflows"
        ((PASSES++))
    fi

    # Check for required status checks patterns
    if find .github/workflows/ -name "*.yml" -exec grep -l "pr-validation\|validation.*success" {} \; | grep -q "."; then
        print_pass "Validation requirements found in workflows"
        ((PASSES++))
    fi

    # Check for appropriate concurrency controls
    if grep -r "concurrency:" .github/workflows/ >/dev/null 2>&1; then
        print_pass "Concurrency controls found in workflows"
        ((PASSES++))
    else
        print_warn "No concurrency controls - workflows might run simultaneously"
        ((MEDIUM_ISSUES++))
    fi
}

print_header "CI/CD SECURITY REVIEW"

print_info "Analyzing CI/CD system for security vulnerabilities and best practices"
print_info "Review covers: permissions, tokens, Docker security, dependencies, and access control"
echo ""

# Review all workflow files
print_header "WORKFLOW SECURITY ANALYSIS"
find .github/workflows -name "*.yml" -o -name "*.yaml" | while read -r workflow; do
    check_workflow_permissions "$workflow"
    check_workflow_triggers "$workflow"
    echo ""
done

# Review Docker configurations
print_header "DOCKER SECURITY ANALYSIS"
find containers -name "Dockerfile*" | while read -r dockerfile; do
    check_docker_security "$dockerfile"
    echo ""
done

# Environment and secrets
print_header "ENVIRONMENT & SECRETS ANALYSIS"
check_environment_security
echo ""

# Dependency security
print_header "DEPENDENCY SECURITY ANALYSIS"
check_dependency_security
echo ""

# Access control
print_header "ACCESS CONTROL ANALYSIS"
check_access_control
echo ""

# Summary
print_header "SECURITY REVIEW SUMMARY"

total_issues=$((CRITICAL_ISSUES + HIGH_ISSUES + MEDIUM_ISSUES + LOW_ISSUES))

echo -e "${BLUE}📊 Security Analysis Results:${NC}"
echo "  ✅ Passes: $PASSES"
echo "  🔴 Critical Issues: $CRITICAL_ISSUES"
echo "  🟠 High Issues: $HIGH_ISSUES"
echo "  🟡 Medium Issues: $MEDIUM_ISSUES"
echo "  🔵 Low Issues: $LOW_ISSUES"
echo ""
echo "📈 Total Issues: $total_issues"
echo "📈 Security Score: $PASSES issues resolved, $total_issues issues found"

# Recommendations
print_header "SECURITY RECOMMENDATIONS"

if [ $CRITICAL_ISSUES -gt 0 ]; then
    echo -e "${RED}🚨 CRITICAL: Address critical security issues immediately${NC}"
fi

if [ $HIGH_ISSUES -gt 0 ]; then
    echo -e "${RED}⚠️  HIGH: Address high-priority security issues soon${NC}"
fi

echo ""
echo "🔒 General Security Recommendations:"
echo "  1. Enable Dependabot for automated security updates"
echo "  2. Add npm audit to CI/CD pipeline"
echo "  3. Review and minimize workflow permissions regularly"
echo "  4. Ensure all Docker containers run as non-root users"
echo "  5. Enable branch protection rules with required status checks"
echo "  6. Consider adding SAST (Static Application Security Testing) tools"
echo "  7. Implement secret scanning in CI/CD"
echo "  8. Regular security reviews of workflow configurations"

# Exit code based on critical/high issues
if [ $CRITICAL_ISSUES -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ SECURITY REVIEW FAILED - Critical issues found${NC}"
    exit 1
elif [ $HIGH_ISSUES -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  SECURITY REVIEW WARNING - High-priority issues found${NC}"
    exit 0
else
    echo ""
    echo -e "${GREEN}✅ SECURITY REVIEW PASSED - No critical or high-priority issues${NC}"
    exit 0
fi