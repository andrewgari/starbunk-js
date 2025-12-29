# CI/CD Cleanup Plan

## Current Issue

**PR #318 is blocked** by a "Code Scanning" check that doesn't exist. This is likely a phantom required check in branch protection settings.

### Immediate Fix Required

1. **Remove "Code Scanning" from required checks** in branch protection settings
   - Go to: https://github.com/andrewgari/starbunk-js/settings/branches
   - Edit the `main` branch protection rule
   - Remove "Code Scanning" from the required status checks list
   - This will unblock PR #318 immediately

## Workflow Cleanup Recommendations

### 🗑️ Files to DELETE (Immediate)

1. **`.github/workflows/manual-snapshot-publisher.yml.disabled`**
   - Already disabled, no longer needed
   - Safe to delete

2. **`.github/workflows/docker-build-reusable.yml.disabled`**
   - Already disabled, no longer needed
   - Safe to delete

3. **`.github/workflows/main-publish.yml`** (158 lines)
   - **DUPLICATE** of `publish-main.yml` (395 lines)
   - The newer `publish-main.yml` is more comprehensive with:
     - Better workflow_dispatch options
     - Skip validation option for emergencies
     - Specific container selection
   - Safe to delete `main-publish.yml`

### ⚠️ Files to CONSOLIDATE (Recommended)

4. **`pr-validation.yml` vs `selective-pr-validation.yml`**
   - Both do PR validation with similar triggers
   - `selective-pr-validation.yml` is more advanced (868 lines vs 641 lines)
   - **Recommendation**: Keep `selective-pr-validation.yml`, remove `pr-validation.yml`
   - **Risk**: Medium - verify all required checks reference the correct workflow name

### 🤔 Files to REVIEW (Optional)

5. **Monitoring Workflows** (potentially excessive)
   - `build-metrics.yml` - Build metrics collection
   - `ghcr-monitoring.yml` - GHCR health monitoring
   - `ghcr-lifecycle-management.yml` - Image lifecycle management
   - **Question**: Are all three monitoring workflows actively used?
   - **Recommendation**: Review logs to see if these provide value

6. **`path-filter-validation.yml`**
   - Validates path filter configuration
   - Might be redundant if other workflows handle this
   - **Recommendation**: Review if this is still needed

7. **`structure-validation.yml`**
   - Validates repository structure
   - **Question**: Is this actively providing value?

8. **`automated-dependency-updates.yml`**
   - Automated dependency updates
   - **Question**: Is this working correctly? Are PRs being created?

9. **`changelog-generation.yml`**
   - Automated changelog generation
   - **Question**: Is the changelog being maintained?

## Summary

### Immediate Actions (Safe to do now)
- [ ] Remove "Code Scanning" from branch protection required checks
- [ ] Delete `manual-snapshot-publisher.yml.disabled`
- [ ] Delete `docker-build-reusable.yml.disabled`
- [ ] Delete `main-publish.yml` (duplicate of `publish-main.yml`)

### Recommended Actions (After verification)
- [ ] Remove `pr-validation.yml` (use `selective-pr-validation.yml` instead)
- [ ] Update any branch protection rules that reference `pr-validation.yml`

### Optional Review
- [ ] Review monitoring workflows for actual usage
- [ ] Review validation workflows for redundancy
- [ ] Review automation workflows for effectiveness

## Workflow Count

**Current**: 26 workflow files (2 already disabled)
**After immediate cleanup**: 22 workflow files
**After recommended cleanup**: 21 workflow files
**Potential final count**: 15-18 workflow files (after optional review)

## Risk Assessment

- **Low Risk**: Deleting .disabled files and obvious duplicates
- **Medium Risk**: Consolidating PR validation workflows
- **High Risk**: Removing monitoring/validation workflows without usage analysis

