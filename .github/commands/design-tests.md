description = "PRD-driven test strategy ensuring acceptance criteria validation"
prompt = """
# Test Strategy & Scaffolding Command

## 🎯 PRD-Driven Testing
**Primary Goal**: Design tests that validate PRD acceptance criteria
**Reference**: `docs/PRD_SYSTEM_IMPLEMENTATION_PLAN.md` validation framework

Test coverage must address every PRD acceptance criterion and success metric.

You are designing a comprehensive testing strategy and generating test scaffolding aligned with PRD requirements.

## Test Strategy Protocol

### Phase 1: Current State Analysis
1. **Inventory Existing Tests**
   ```bash
   # Find all test files
   fd -e test.ts -e spec.ts

   # Count tests
   rg "describe|it\(" --type ts tests/ | wc -l

   # Check coverage
   npm test -- --coverage
   ```

2. **Identify Gaps**
   - Untested modules
   - Low coverage areas (<80%)
   - Missing edge cases
   - Integration test gaps

### Phase 2: Test Architecture Design
1. **Testing Pyramid**
   ```
   E2E Tests (5%)        ▲
   Integration (15%)    ███
   Unit Tests (80%)   ███████
   ```

2. **Test Types & Placement**
   - **Unit**: `tests/unit/` - Pure functions, utilities, business logic
   - **Integration**: `tests/integration/` - Service interactions, DB queries
   - **E2E**: `tests/e2e/` - Full user workflows
   - **Contract**: `tests/contract/` - API contracts between services

### Phase 3: Test Pattern Selection
1. **Unit Test Patterns**
   - AAA (Arrange, Act, Assert)
   - Given-When-Then
   - Test builders for complex objects
   - Property-based testing (fast-check)

2. **Integration Test Patterns**
   - Test containers (Docker)
   - Database fixtures
   - API mocking (MSW)
   - Event simulation

3. **E2E Test Patterns**
   - Page objects (if UI)
   - Discord bot command simulation
   - External service mocking
   - State cleanup between tests

### Phase 4: Test Data Strategy
1. **Factories & Builders**
   ```typescript
   // Example pattern to generate
   class UserFactory {
     static create(overrides?: Partial<User>): User {
       return {
         id: faker.string.uuid(),
         name: faker.person.fullName(),
         ...overrides
       }
     }
   }
   ```

2. **Fixtures**
   - Seed data for integration tests
   - JSON fixtures for API responses
   - Database snapshots

### Phase 5: Test Infrastructure
1. **Setup & Teardown**
   - Global setup/teardown
   - Per-suite setup/teardown
   - Test isolation strategies
   - Parallel execution safety

2. **Mocking Strategy**
   - When to mock vs real implementation
   - Shared mock factories
   - Mock verification
   - Spy usage patterns

### Phase 6: Coverage & Quality Metrics
1. **Coverage Targets**
   - Line coverage: 80%+
   - Branch coverage: 75%+
   - Function coverage: 90%+
   - Statement coverage: 80%+

2. **Quality Metrics**
   - Test execution time (<5min for unit)
   - Flakiness rate (<1%)
   - Test maintenance burden
   - Mutation testing score

### Phase 7: Continuous Testing
1. **Pre-commit Hooks**
   ```bash
   # Run affected tests
   npm test -- --changed
   ```

2. **CI/CD Pipeline**
   - Parallel test execution
   - Test result reporting
   - Coverage enforcement
   - Failed test notifications

## Test Scaffolding Generator

For each untested module, generate:

```typescript
// tests/unit/[module-name].test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { [ModuleName] } from '@/[path]/[module-name]'

describe('[ModuleName]', () => {
  beforeEach(() => {
    // Setup
  })

  describe('[method/function name]', () => {
    it('should [expected behavior] when [condition]', () => {
      // Arrange
      const input = ...

      // Act
      const result = ...

      // Assert
      expect(result).toBe(...)
    })

    it('should throw [error] when [invalid condition]', () => {
      expect(() => ...).toThrow(...)
    })

    it('should handle edge case: [description]', () => {
      // Test edge case
    })
  })
})
```

## Output Format

```markdown
# Test Strategy Document

## Current State
- Total tests: X
- Coverage: X%
- Execution time: Xms
- Flaky tests: X

## Test Architecture
[Describe the testing pyramid and placement]

## Priority Testing Targets
1. **[Module Name]** - Priority: CRITICAL
   - Reason: [Why critical]
   - Test types needed: [Unit/Integration/E2E]
   - Estimated tests: X
   - Complexity: [Low/Med/High]

[Repeat for top 10 priorities]

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Set up test infrastructure
- [ ] Create test utilities & factories
- [ ] Implement critical path tests
- [ ] Achieve 60% coverage

### Phase 2: Expansion (Week 2-3)
- [ ] Add integration tests
- [ ] Test error paths
- [ ] Reach 80% coverage

### Phase 3: Excellence (Week 4+)
- [ ] E2E test suite
```
"""
