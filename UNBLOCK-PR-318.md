# How to Unblock PR #318

## The Problem

Your PR #318 is blocked by a **"Code Scanning"** check that doesn't actually exist. All 46 actual checks are passing, but GitHub is waiting for a "Code Scanning" result that will never come because there's no CodeQL or code scanning workflow configured.

## The Solution

You need to remove "Code Scanning" from the required status checks in your branch protection settings.

### Step-by-Step Instructions

1. **Open Branch Protection Settings**
   - Go to: https://github.com/andrewgari/starbunk-js/settings/branches
   - Or navigate: Settings → Branches → Edit rule for `main`

2. **Find Required Status Checks**
   - Scroll down to "Require status checks to pass before merging"
   - Look for the list of required checks

3. **Remove "Code Scanning"**
   - Find "Code Scanning" in the list of required checks
   - Click the ❌ or remove button next to it
   - This check doesn't have a corresponding workflow, so it will always block PRs

4. **Save Changes**
   - Scroll to the bottom and click "Save changes"

5. **PR Will Auto-Merge**
   - Once saved, PR #318 should automatically merge (you have auto-merge enabled)
   - All other checks are already passing ✅

## What I've Already Done

✅ **Cleaned up redundant CI/CD workflows**
- Removed 3 workflow files:
  - `manual-snapshot-publisher.yml.disabled` (already disabled)
  - `docker-build-reusable.yml.disabled` (already disabled)
  - `main-publish.yml` (duplicate of `publish-main.yml`)
- Reduced workflow count from 26 to 23 files
- Created comprehensive cleanup plan in `docs/ci-cd-cleanup-plan.md`

## Optional: Further Cleanup

See `docs/ci-cd-cleanup-plan.md` for additional cleanup recommendations:

### Safe to Remove (after verification)
- `pr-validation.yml` - superseded by `selective-pr-validation.yml`

### Review for Value
- Multiple monitoring workflows (build-metrics, ghcr-monitoring, ghcr-lifecycle-management)
- Validation workflows (path-filter-validation, structure-validation)
- Automation workflows (automated-dependency-updates, changelog-generation)

## Alternative: Add CodeQL Workflow

If you actually want code scanning (not recommended for cleanup), you could add a CodeQL workflow instead:

```yaml
# .github/workflows/codeql.yml
name: CodeQL
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript
      - uses: github/codeql-action/analyze@v3
```

But since you want to **clean up**, not add more workflows, I recommend just removing the requirement.

## Summary

**Immediate Action Required**: Remove "Code Scanning" from branch protection required checks

**Result**: PR #318 will auto-merge, and you'll have 3 fewer workflow files cluttering your repo.

