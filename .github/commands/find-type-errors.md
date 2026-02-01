description = "TypeScript type safety audit aligned with code quality PRD initiatives"
prompt = """
# TypeScript Type Safety Audit

## 🎯 PRD Context
**Initiative Reference**: Type safety & zero-`any` policy (See `docs/PLAN.md`)

This audit directly supports PRD acceptance criteria for type system integrity and code quality.

You are performing a rigorous type safety audit to eliminate `any`, improve type inference, and enhance compile-time safety according to PRD requirements.

## Audit Protocol

### Phase 1: Type Pollution Detection
1. **Search for Type Escape Hatches**
   ```bash
   # Find all 'any' usage
   rg ":\s*any\b" --type ts

   # Find type assertions
   rg "as\s+\w+" --type ts

   # Find @ts-ignore/expect-error
   rg "@ts-(ignore|expect-error)" --type ts
   ```

2. **Categorize Findings**
   - **Critical**: `any` in public APIs
   - **High**: `any` in core business logic
   - **Medium**: `any` in utility functions
   - **Low**: `any` in test files or scripts

### Phase 2: Type Coverage Analysis
1. **Measure Type Density**
   - Count typed vs untyped parameters
   - Identify missing return types
   - Find untyped variables (implicit any)

2. **Check Strictness Flags**
   Review tsconfig.json for:
   - `strict: true`
   - `noImplicitAny: true`
   - `strictNullChecks: true`
   - `strictFunctionTypes: true`
   - `noUncheckedIndexedAccess: true`

### Phase 3: Advanced Type Opportunities
1. **Discriminated Unions**
   - Identify enum-like patterns
   - Convert to discriminated unions
   - Use exhaustive checking

2. **Template Literal Types**
   - Find string literal patterns
   - Apply template literal types
   - Improve autocompletion

3. **Type Guards & Predicates**
   - Locate runtime checks
   - Convert to type predicates
   - Add assertion functions

4. **Branded Types**
   - Identify primitive obsession
   - Create branded types for domain values
   - Prevent cross-domain assignment

### Phase 4: Inference Improvements
1. **Generic Constraints**
   - Add proper constraints to generics
   - Use `extends` for better inference
   - Apply conditional types where appropriate

2. **Const Assertions**
   - Find literal objects
   - Apply `as const` for immutability
   - Improve literal type inference

### Phase 5: API Safety
1. **External Boundaries**
   - Validate all external data with Zod/io-ts
   - Parse, don't type cast
   - Create validated types at boundaries

2. **Internal Contracts**
   - Review inter-package types
   - Ensure consistency across modules
   - Document type invariants

## Output Format

```markdown
# TypeScript Type Audit Report

## Executive Summary
- Total `any` occurrences: X
- Type coverage: X%
- Critical issues: X
- Recommendations: X

## Findings by Severity

### Critical (Immediate Action Required)
1. [File:Line] - [Description]
   - **Risk**: [Why this is dangerous]
   - **Fix**: [Specific solution]
   - **Effort**: X hours

[Repeat for each finding]

### High Priority
[Same structure]

### Medium Priority
[Same structure]

### Low Priority / Enhancements
[Same structure]

## Improvement Roadmap

### Phase 1: Stop the Bleeding (Week 1)
- [ ] Fix all Critical `any` usages
- [ ] Enable missing strict flags
- [ ] Add Zod validation at boundaries

### Phase 2: Strengthen Core (Week 2-3)
- [ ] Eliminate High priority issues
- [ ] Apply discriminated unions
- [ ] Add type guards

### Phase 3: Excellence (Week 4+)
- [ ] Refactor to advanced patterns
- [ ] Improve inference quality
- [ ] Document type architecture

## Metrics Tracking
- Baseline `any` count: X
- Target `any` count: Y
- Progress: [Progress bar]
```

## Context
- Package Focus: !{echo $PACKAGE}
- Audit Depth: !{echo $DEPTH}
- Timeline: !{echo $TIMELINE}
- **PRD Initiative**: !{echo $PRD_INITIATIVE}
- **Type Safety Target**: !{echo $TYPE_SAFETY_GOAL}

## 📊 PRD Success Metrics
Link audit findings to PRD acceptance criteria:
- Zero `any` in public APIs per PRD
- Type coverage: 100% of critical paths per PRD
- All discriminated unions implemented per spec
"""
