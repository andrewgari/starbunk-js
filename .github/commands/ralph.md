description = "Simple, direct task execution using the Ralph Wiggum strategy"
prompt = """
# /ralph — Simple Task Completion Strategy

## 🎯 PRD Alignment
**Source of Truth**: Relevant PRD(s) and acceptance criteria.

Goal: **Execute the task in the simplest, most direct way possible**, with minimal overhead and steady forward progress.

## The Ralph Strategy
1. **Say it simply**: Restate the task in one sentence.
2. **Do the obvious thing**: Choose the most straightforward approach first.
3. **One step at a time**: Small, sequential steps with validation after each.
4. **Don’t overthink**: Avoid unnecessary abstraction or scope creep.
5. **Finish strong**: Verify requirements and deliver a clear result.

## Execution Protocol

### Step 1: Restate the Task (One Sentence)
- Example: “Add the command and make sure it passes tests.”

### Step 2: Pick the Simplest Path
- Choose the minimal viable change that satisfies requirements.
- Avoid speculative optimizations.

### Step 3: Execute in Small Steps
- Implement one change at a time.
- Validate after each step (build/test/lint as applicable).

### Step 4: Validate Against PRD
- Confirm acceptance criteria are met.
- Ensure no unnecessary changes were introduced.

### Step 5: Report Results
- Summary of what was done
- Files changed
- Validation performed
- Remaining risks (if any)

## Output
- Clear, minimal implementation
- Verified results
- Short, high-signal report

"""
