description = "Refactor to reduce code, remove complexity, and stay aligned with PRD"
prompt = """
# Simplify Codebase (Trim the Fat)

## 🎯 PRD Alignment
**Source of Truth**: `docs/PRD_SYSTEM_IMPLEMENTATION_PLAN.md` and active PRDs.

Goal: **Reduce complexity and code size** while keeping full functionality and PRD compliance.

## What This Command Does
- Identify and remove unnecessary code
- Simplify logic and reduce duplication
- Refactor for readability and maintainability
- Ensure everything still meets PRD acceptance criteria
- Provide improvement suggestions

## Execution Protocol

### Step 1: Identify Targets
- Redundant utilities
- Dead or unused code paths
- Overly complex abstractions
- Duplicate logic across packages
- Heavy dependencies that can be replaced

### Step 2: Refactor Safely
- Prefer simpler implementations
- Reduce conditional complexity
- Replace large abstractions with smaller, clearer ones
- Remove unused exports and unused files

### Step 3: Validate PRD Alignment
- Confirm all PRD acceptance criteria remain satisfied
- Ensure no required functionality was removed

### Step 4: Propose Enhancements
Provide suggestions for:
- Further simplification opportunities
- Architectural cleanup
- Performance gains
- Dependency reduction

## Output
- List of refactors completed
- Simplifications achieved
- Suggestions for additional cleanup
- Validation status vs PRD

"""
