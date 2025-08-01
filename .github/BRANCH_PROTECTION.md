# Branch Protection Rules Configuration

This document outlines the required GitHub branch protection rules for the `main` branch to ensure code quality and container stability.

## Required Status Checks

The following status checks must pass before any pull request can be merged into the `main` branch:

### 🔒 **REQUIRED CHECKS** (Blocking)

These checks **MUST PASS** for PR merging:

#### **Container Startup Validation**
- **Check Name**: `Container Validation Summary`
- **Workflow**: `container-startup-validation.yml`
- **Purpose**: Validates that all containers start up properly and core functionality works
- **Includes**:
  - Unit tests for all containers
  - CovaBot filtering validation
  - Container startup component tests
  - Service initialization verification

#### **Code Quality Analysis**
- **Check Name**: `Code Quality Analysis`
- **Workflow**: `security.yml` (if exists)
- **Purpose**: Ensures code meets quality standards
- **Includes**:
  - ESLint validation
  - TypeScript compilation
  - Code formatting checks

#### **Security Analysis**
- **Check Name**: `Security Analysis`
- **Workflow**: `security.yml`
- **Purpose**: Validates security compliance
- **Includes**:
  - Dependency vulnerability scanning
  - Security policy compliance
  - Secret detection

#### **Performance Analysis**
- **Check Name**: `Performance Analysis`
- **Workflow**: `build-metrics.yml`
- **Purpose**: Ensures performance standards are met
- **Includes**:
  - Build time analysis
  - Bundle size validation
  - Memory usage checks

#### **Build Optimization Summary**
- **Check Name**: `Build Optimization Summary`
- **Workflow**: `container-build-test-publish.yml`
- **Purpose**: Validates container builds and optimizations
- **Includes**:
  - Container build success
  - Image size optimization
  - Multi-stage build validation

### 📋 **OPTIONAL CHECKS** (Non-blocking)

These checks provide additional information but don't block merging:

#### **Claude Review**
- **Check Name**: `Claude Review`
- **Workflow**: Triggered by `review` label
- **Purpose**: AI-powered code review
- **Trigger**: Manual via `review` label

#### **Container Build & Test**
- **Check Name**: `Container Build & Test`
- **Workflow**: `container-build-test-publish.yml`
- **Purpose**: Builds and tests containers
- **Trigger**: Automatic on container changes

#### **Container Publish**
- **Check Name**: `Container Publish`
- **Workflow**: `container-build-test-publish.yml`
- **Purpose**: Publishes container images
- **Trigger**: Manual via `publish` label

#### **Dependency Security Check**
- **Check Name**: `Dependency Security Check`
- **Workflow**: `automated-dependency-updates.yml`
- **Purpose**: Validates dependency security
- **Trigger**: Automatic on dependency changes

## Configuration Instructions

### Via GitHub Web Interface

1. Navigate to **Settings** → **Branches**
2. Click **Add rule** or edit existing rule for `main`
3. Configure the following settings:

#### **General Settings**
- ✅ **Require a pull request before merging**
- ✅ **Require approvals**: 1
- ✅ **Dismiss stale PR approvals when new commits are pushed**
- ✅ **Require review from code owners** (if CODEOWNERS file exists)

#### **Status Checks**
- ✅ **Require status checks to pass before merging**
- ✅ **Require branches to be up to date before merging**

**Required status checks to add:**
```
Container Validation Summary
Code Quality Analysis
Security Analysis
Performance Analysis
Build Optimization Summary
```

#### **Additional Restrictions**
- ✅ **Restrict pushes that create files that match a pattern**: `*.env`, `*.key`, `*.pem`
- ✅ **Do not allow bypassing the above settings**
- ✅ **Allow force pushes**: ❌ (disabled)
- ✅ **Allow deletions**: ❌ (disabled)

### Via GitHub CLI

```bash
# Create branch protection rule
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["Container Validation Summary","Code Quality Analysis","Security Analysis","Performance Analysis","Build Optimization Summary"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null
```

### Via Terraform (if using Infrastructure as Code)

```hcl
resource "github_branch_protection" "main" {
  repository_id = github_repository.repo.node_id
  pattern       = "main"

  required_status_checks {
    strict = true
    contexts = [
      "Container Validation Summary",
      "Code Quality Analysis", 
      "Security Analysis",
      "Performance Analysis",
      "Build Optimization Summary"
    ]
  }

  required_pull_request_reviews {
    required_approving_review_count = 1
    dismiss_stale_reviews          = true
  }

  enforce_admins = true
}
```

## Workflow Integration

### Container Startup Validation Workflow

The `container-startup-validation.yml` workflow provides comprehensive validation:

#### **Automatic Triggers**
- Pull requests affecting container code
- Pushes to main branch
- Changes to shared dependencies

#### **Manual Triggers**
- Workflow dispatch with test level selection
- `test:e2e` label for full E2E testing

#### **Test Levels**
1. **Unit Tests**: Fast component validation
2. **Integration Tests**: Service interaction validation  
3. **E2E Tests**: Full container startup validation

#### **Matrix Strategy**
- Tests multiple containers in parallel
- Optimized for changed containers only
- Comprehensive coverage across all services

## Troubleshooting

### Common Issues

#### **"Container Validation Summary" check not found**
- Ensure the workflow file exists: `.github/workflows/container-startup-validation.yml`
- Verify the job name matches exactly: `validation-summary`
- Check that the workflow has run at least once

#### **Tests failing in CI but passing locally**
- Check environment variables are properly set
- Verify Node.js version matches (20.x)
- Ensure all dependencies are installed correctly

#### **E2E tests timing out**
- Increase timeout in workflow (currently 10 minutes)
- Check container build performance
- Verify test environment setup

### Debug Commands

```bash
# Test locally before pushing
npm run test:unit
npm run test:container
npm test -- --testPathPattern="covabot-filtering"

# Check workflow syntax
gh workflow view container-startup-validation.yml

# Monitor workflow runs
gh run list --workflow=container-startup-validation.yml
```

## Maintenance

### Regular Updates

1. **Monthly**: Review and update required checks
2. **Quarterly**: Validate branch protection effectiveness
3. **After major changes**: Update check names if workflows change

### Performance Monitoring

- Monitor workflow execution times
- Optimize test suites for faster feedback
- Balance thoroughness with speed

This configuration ensures that all code changes are properly validated before reaching production while maintaining development velocity.
