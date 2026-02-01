description = "Iterative error elimination: fix all local and CI errors until clean"
prompt = """
# Fix-All Errors Loop (Local + CI)

## 🎯 PRD Alignment
**Source of Truth**: `docs/PRD_SYSTEM_IMPLEMENTATION_PLAN.md` and active initiative PRDs.

This command’s goal is to **eliminate all errors** in local and CI by iterating until **zero errors remain**. Validate fixes continuously and keep going until everything is green.

## Core Objective
- Run local checks and CI validation.
- Fix all errors found.
- Repeat until **no errors exist**.

## Execution Protocol

### Step 1: Establish Baseline
1. Identify project scripts in `package.json` and workspace tooling.
2. Determine required checks (examples):
   - Type check
   - Lint
   - Unit tests
   - Build
   - CI workflow parity

### Step 2: Run Local Checks
- Run the full local suite or targeted failing commands.
- Record failures with exact error messages.

### Step 3: Fix Errors
- Fix the highest-impact failures first.
- Update code, tests, or configs as needed.
- Ensure changes align with PRD acceptance criteria.

### Step 4: Validate Locally
- Re-run only the failed checks until they pass.
- Then run the full local suite for confirmation.

### Step 5: Validate CI Parity
- If CI config exists, mirror its steps locally where possible.
- If CI can be triggered, confirm success.

### Step 6: Loop Until Clean
- **Repeat Steps 2–5** until:
  - All local checks pass
  - CI checks are green
  - No errors remain

## Exit Criteria
- ✅ Local checks: clean
- ✅ CI checks: green
- ✅ No remaining errors
- ✅ PRD alignment preserved

## Reporting Format
Provide a final report with:
- Summary of fixes (grouped by error type)
- Commands executed
- Files changed
- Evidence of clean local + CI

"""
