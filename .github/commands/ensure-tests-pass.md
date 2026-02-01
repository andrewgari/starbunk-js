---
description: "Run all unit tests across packages and verify they pass"
---

# Ensure Tests Pass

## 🎯 PRD Alignment
**Source of Truth**: Agent Coordination & PRD Workflow - Quality Gates

**Goal**: Run the complete circleci test suite, catch failures early, and report results clearly.

## The Ralph Strategy
1. **Say it simply**: Tests must pass before code ships
2. **Do the obvious thing**: Run `npm test` from each package
3. **One step at a time**: Test shared, then test each service
4. **Don't overthink**: If tests fail, report which ones and stop
5. **Finish strong**: Verify coverage and document results

## Execution Protocol

### Step 1: Check Test Infrastructure
- Run `npm test --version` to confirm test runner is available
- Verify `vitest` is installed across packages
- Expected: Test runner is ready

### Step 2: Run Shared Package Tests
- Execute: `cd /home/andrewgari/Repos/starbunk-js/src/shared && npm test`
- Expected: All shared tests pass or clear failure message

### Step 3: Run Service Tests (Sequential)
For each service (bluebot, bunkbot, covabot, djcova):
- Execute: `cd src/[service] && npm test`
- Expected: Service tests pass or failure is identified

### Step 4: Collect Results
- Count total tests passing
- Identify any failures by package
- Note coverage levels (if available)
- Expected: Clear pass/fail per package

### Step 5: Validate No Test Artifacts Left
- Verify no stray `.test.` or `.spec.` files are untracked
- Confirm test outputs are in gitignore
- Expected: Clean working directory

### Final Step: Report Results

If all tests pass:
```
## ✅ All Tests Passing

**Test Results**:
- Shared: [X] tests ✅
- Service A: [X] tests ✅
- Service B: [X] tests ✅
- Service C: [X] tests ✅
- Service D: [X] tests ✅

**Coverage**: [X%] on critical paths

**Validation**:
- ✅ All unit tests passing
- ✅ No test failures
- ✅ Clean working directory

**Result**: Ready to proceed with code review
```

If tests fail:
```
## ❌ Test Failures Detected

**Failed Tests**:
- [Package]: [Test name] - [Reason]

**Next Steps**:
1. Fix failing tests
2. Re-run `ensure-tests-pass`
3. Report back when fixed

**Blocker**: Code cannot proceed until tests pass
```

## Red Flags
- ❌ Ignoring test failures to "move faster"
- ❌ Skipping test validation before commits
- ❌ Tests that pass locally but fail in CI
- ❌ Flaky tests that pass/fail randomly

## Usage
Run from project root:
```bash
# Single package
cd src/shared && npm test

# All packages
npm test  # if root package.json supports it

# Watch mode (development)
cd src/[package] && npm test -- --watch
```

## Success Criteria
- ✅ All unit tests pass
- ✅ No test output errors or warnings
- ✅ Coverage is adequate for critical paths
- ✅ Results are documented
- ✅ No flaky tests detected

## Quality Checklist
- [ ] Test runner is available
- [ ] All packages tested
- [ ] No test failures
- [ ] Results documented
- [ ] Coverage verified
- [ ] Ready for next phase
