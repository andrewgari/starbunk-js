description = "Comprehensive codebase analysis aligned with strategic PRD initiatives"
prompt = """
# Deep Dive Analysis Command

## 🎯 Strategic Context
**PRD Alignment**: Reference `docs/PRD_SYSTEM_IMPLEMENTATION_PLAN.md` and `docs/PLAN.md`

Before conducting analysis, identify which PRD initiative this supports. This analysis should directly inform or validate active PRD requirements and acceptance criteria.

## 🔍 Analysis Protocol

You are conducting a comprehensive analysis to inform architectural decisions tied to PRD initiatives.

## Analysis Protocol

### Phase 1: Structural Discovery
1. Map the complete file structure using tree/ls commands
2. Identify key architectural patterns (monorepo structure, shared libraries, etc.)
3. Locate configuration files (tsconfig, package.json, docker-compose, etc.)
4. Document the technology stack

### Phase 2: Dependency Analysis
1. Read all package.json files across packages
2. Identify shared dependencies and potential conflicts
3. Map internal dependencies between packages
4. Flag outdated or vulnerable dependencies

### Phase 3: Code Pattern Analysis
1. Search for common patterns using grep/ripgrep:
   - Factory patterns
   - Strategy patterns
   - Singleton usage
   - Error handling approaches
   - Type definitions and interfaces
2. Identify anti-patterns or code smells
3. Document architectural conventions

### Phase 4: Testing & Quality
1. Locate test files and calculate coverage
2. Review test patterns (unit, integration, e2e)
3. Check for linting/formatting configs
4. Identify CI/CD pipelines

### Phase 5: Documentation Review
1. Read SYSTEM_SPEC.md, PRD.md, README files
2. Check alignment between docs and implementation
3. Identify gaps in documentation
4. Review API documentation

## Output Format

Provide a structured report with:
- **Executive Summary**: High-level findings (3-5 bullets)
- **Architecture Map**: Visual representation of system structure
- **Key Findings**: Organized by category (strengths, risks, opportunities)
- **Recommendations**: Prioritized action items
- **Technical Debt**: Specific issues with severity ratings

## Context Variables
- Repository: !{echo $REPOSITORY}
- Focus Area: !{echo $FOCUS_AREA}
- Analysis Depth: !{echo $ANALYSIS_DEPTH}
- **PRD Initiative**: !{echo $PRD_INITIATIVE}
- **Acceptance Criteria**: !{echo $ACCEPTANCE_CRITERIA}

## 📋 PRD Validation Checklist
After analysis, verify:
- [ ] Findings align with PRD acceptance criteria
- [ ] Any blockers identified and documented
- [ ] Dependencies mapped to PRD phases
- [ ] Risk assessment tied to PRD timeline

Ensure all findings are backed by specific file references with line numbers.
"""
