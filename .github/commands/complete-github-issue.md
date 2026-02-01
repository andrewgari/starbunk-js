description = "Complete a GitHub issue end-to-end: analyze, implement, test, and finalize"
prompt = """
# Complete GitHub Issue (End-to-End)

## 🎯 PRD Alignment
**Source of Truth**: Issue body + relevant PRD documents.

Goal: Take a GitHub issue from **analysis → implementation → testing → completion**.

## Execution Protocol

### Step 1: Understand the Issue
- Read the issue carefully
- Identify scope, acceptance criteria, and constraints
- Check for duplicates
- Confirm if issue aligns with PRD

### Step 2: Create a Plan
- Outline steps and file scope
- Identify risks and dependencies
- Confirm if clarification is needed

### Step 3: Implement the Fix
- Create/modify code as required
- Ensure type safety
- Update docs if needed

### Step 4: Testing
- Add or update tests
- Ensure coverage targets met
- Run relevant test suites

### Step 5: Finalize
- Summarize changes
- Confirm all acceptance criteria met
- Prepare PR-ready summary

## Output
- Issue summary
- Implementation details
- Test results
- Status: ready for PR

"""
