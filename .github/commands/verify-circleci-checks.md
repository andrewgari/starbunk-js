---
description: "Verify all CircleCI checks pass for the current commit"
---

# Verify CircleCI Checks Pass

## 🎯 PRD Alignment
**Source of Truth**: Agent Coordination & PRD Workflow - Quality Gates

**Goal**: Check CircleCI job status and confirm all pipeline checks pass before proceeding.

## The Ralph Strategy
1. **Say it simply**: CircleCI must be green before code ships
2. **Do the obvious thing**: Check the CircleCI API or GitHub checks status
3. **One step at a time**: Verify each stage (detect, build, test, deploy prep)
4. **Don't overthink**: If any job fails, stop and report why
5. **Finish strong**: Document status and next steps

## Execution Protocol

### Step 1: Identify Current Commit
- Run: `git rev-parse HEAD` to get current commit hash
- Expected: Commit SHA is displayed

### Step 2: Check CircleCI Job Status via GitHub API
- Use GitHub API to fetch check runs for the commit:
  ```bash
  gh api repos/{owner}/{repo}/commits/{commit}/check-runs --jq '.check_runs[] | {name: .name, status: .status, conclusion: .conclusion}'
  ```
- Expected: List of all CircleCI job statuses (completed/in_progress/queued)

### Step 3: Verify All Jobs Passed
- Check if any job has `conclusion: "failure"` or `status: "in_progress"`
- Expected outcomes:
  - ✅ All jobs have `conclusion: "success"` → Proceed
  - ⏳ Some jobs still `in_progress` → Wait or check again later
  - ❌ Any job failed → Stop and identify failure

### Step 4: If All Passed, Report Success
- Count total jobs passed
- Note any warnings (e.g., skipped jobs)
- Expected: Clear pass confirmation

### Step 5: If Any Failed, Report Failure
- Identify which jobs failed
- Link to CircleCI workflow for debugging
- Expected: Clear failure reason

### Final Step: Validate & Report

If all checks pass:
```
## ✅ CircleCI Checks Passing

**Commit**: [SHA]
**Total Jobs**: [X] ✅
**Status**: All checks green

**Jobs**:
- ✅ detect_and_continue
- ✅ [Other jobs]

**Result**: Ready to merge/deploy
```

If any checks failed:
```
## ❌ CircleCI Checks Failed

**Commit**: [SHA]
**Failed Jobs**:
- [Job Name]: [Error reason]

**Status**: Blocked - fix required

**Next Steps**:
1. Visit CircleCI workflow URL
2. Fix the failing job
3. Re-run `verify-circleci-checks`
4. Report back when green

**Blocker**: Cannot proceed until all checks pass
```

## Red Flags
- ❌ Ignoring CircleCI failures to "move faster"
- ❌ Assuming jobs passed without checking
- ❌ Merging code with red checks
- ❌ Forgetting to re-check after fixes

## Usage
Run from project root:
```bash
# Quick check
git rev-parse HEAD && gh api repos/andrewgari/starbunk-js/commits/$(git rev-parse HEAD)/check-runs

# Full verification with error handling
cd /home/andrewgari/Repos/starbunk-js
COMMIT=$(git rev-parse HEAD)
gh api repos/andrewgari/starbunk-js/commits/$COMMIT/check-runs --jq '.check_runs[] | select(.app.name=="CircleCI") | {name: .name, conclusion: .conclusion, status: .status}'
```

## Success Criteria
- ✅ All CircleCI jobs completed
- ✅ All jobs have "success" conclusion
- ✅ No "failure" or "timed_out" statuses
- ✅ Results documented and reported
- ✅ Clear next steps provided

## Quality Checklist
- [ ] Current commit identified
- [ ] CircleCI check status retrieved
- [ ] All jobs accounted for
- [ ] Pass/fail determination clear
- [ ] Failure reasons identified (if any)
- [ ] Results documented
- [ ] Next steps specified
