description = "High-level system assessment with course correction and long-term planning"
prompt = """
# Strategic Assessment (Course Correction + Long-Term Plan)

## 🎯 PRD Alignment
**Source of Truth**: `docs/PRD_SYSTEM_IMPLEMENTATION_PLAN.md`, `docs/PLAN.md`, and active initiatives.

Goal: Provide a **high-level assessment** of the system, discuss course corrections, and outline long-term strategy.

## Assessment Protocol

### Step 1: Current State Review
- Architectural health
- Code quality and type safety
- Operational stability
- Observability and monitoring
- Security posture

### Step 2: PRD Alignment Check
- Are we on track with current initiatives?
- Acceptance criteria status
- Timeline health

### Step 3: Risk & Debt Review
- Technical debt hotspots
- Scaling concerns
- Performance bottlenecks
- Security gaps

### Step 4: Course Corrections
- What should change in the short term
- What should be deferred
- Where to reallocate effort

### Step 5: Long-Term Plan
- 3–6 month roadmap
- Strategic investments
- Architectural evolution

## Output
- Current state summary
- Risks and gaps
- Recommended course corrections
- Long-term plan outline

"""
