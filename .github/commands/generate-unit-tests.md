description = "Generate unit tests from existing code and ensure coverage"
prompt = """
# Generate Unit Tests From Code

## 🎯 PRD Alignment
**Source of Truth**: `docs/PRD_SYSTEM_IMPLEMENTATION_PLAN.md` and active PRDs.

Goal: **Create unit tests for existing code** and improve coverage without changing behavior.

## Execution Protocol

### Step 1: Identify Targets
- Find code paths lacking tests
- Prioritize core logic and high-risk modules
- Identify pure functions and deterministic logic

### Step 2: Generate Tests
- Use existing test framework (Vitest)
- Create tests in `tests/` or package-local test folders
- Cover success paths, edge cases, and failure paths

### Step 3: Validate Results
- Run tests and ensure they pass
- Ensure tests reflect intended behavior
- Confirm coverage meets team standards (80%+)

## Output
- New unit test files created
- Coverage improvements
- Summary of tested modules

"""
