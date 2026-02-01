description = "PRD-driven refactoring strategy with risk assessment"
prompt = """
# Refactoring Plan Generator

## 🎯 PRD Alignment
**Source of Truth**: `docs/PRD_SYSTEM_IMPLEMENTATION_PLAN.md`

Before planning refactoring, link it to specific PRD initiative acceptance criteria. This refactoring must address measurable PRD requirements and align with PRD timeline.

You are creating a detailed, risk-assessed refactoring plan aligned with PRD requirements.

## Planning Protocol

### Step 1: Impact Analysis
1. **Identify Target Scope**
   - Files to be modified
   - Dependencies (upstream and downstream)
   - Potential breaking changes

2. **Risk Assessment**
   - Critical path components
   - External API contracts
   - Database schema impacts
   - Breaking changes for consumers

3. **Effort Estimation**
   - Development time per component
   - Testing requirements
   - Documentation updates needed
   - Review complexity

### Step 2: Strategy Definition
Choose and document the refactoring strategy:
- **Strangler Fig**: Gradually replace old with new
- **Big Bang**: Replace entire subsystem at once
- **Feature Toggle**: Deploy changes behind feature flags
- **Parallel Run**: Run old and new side-by-side

### Step 3: Phased Execution Plan
Break the refactoring into phases with:
- Clear entry/exit criteria
- Rollback points
- Validation checkpoints
- Dependencies between phases

### Step 4: Safety Measures
Define safeguards:
- **Pre-flight Checks**: What must pass before starting
- **Canary Deployment**: How to validate incrementally
- **Rollback Triggers**: When to abort and revert
- **Monitoring**: Key metrics to track

### Step 5: Communication Plan
Document what to communicate:
- Stakeholder notifications
- Team handoffs
- Documentation updates
- Migration guides for consumers

## Output Format

```markdown
# Refactoring Plan: [Component Name]

## Risk Profile
- **Complexity**: [Low/Medium/High]
- **Impact Radius**: [# of dependent systems]
- **Rollback Difficulty**: [Easy/Moderate/Hard]

## Strategy
[Chosen strategy with justification]

## Phases
### Phase 1: [Name]
- Duration: X days
- Files: [list]
- Entry Criteria: [conditions]
- Exit Criteria: [validation steps]
- Rollback: [procedure]

[Repeat for each phase]

## Safety Checklist
- [ ] All tests passing
- [ ] Snyk scan clean
- [ ] Performance benchmarks stable
- [ ] Documentation updated
- [ ] Team review complete

## Dependencies
- Blocked by: [list]
- Blocks: [list]
- Parallel work: [list]
```

## Context
- Target Component: !{echo $COMPONENT}
- Reason for Refactoring: !{echo $REASON}
- Timeline Constraint: !{echo $TIMELINE}
- **Related PRD**: !{echo $PRD_REFERENCE}
- **Acceptance Criteria from PRD**: !{echo $PRD_CRITERIA}

## ✅ PRD Validation
Refactoring must address:
- [ ] Specific PRD requirement or initiative
- [ ] Measurable acceptance criteria from PRD
- [ ] Timeline aligned with PRD phases
"""
