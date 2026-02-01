# PRD: DJCova Resource Lifecycle Unit Tests

**Issue:** #574  
**Component:** Music Player Manager  
**Phase:** 1 (Critical)  
**Parent Initiative:** PRD: DJCova Audio Player State Management & Testing

## Executive Summary
Develop comprehensive unit tests to validate proper resource cleanup in the DJCova Music Player Manager, ensuring no memory leaks or zombie processes occur during repeated play/stop cycles.

## Problem Statement
The DJCova music player must reliably clean up resources (subscriptions, processes, event listeners) to prevent memory leaks and ensure system stability during extended operation. Without proper unit tests, resource leaks can go undetected until production.

## Objectives
1. **Validate resource cleanup**: Ensure all resources are properly released after stop operations
2. **Prevent memory leaks**: Verify system remains stable through 100+ play/stop cycles
3. **Achieve high coverage**: Target >90% coverage for lifecycle-related code
4. **Catch regressions**: Create tests that fail if resource cleanup breaks

## Acceptance Criteria
- [ ] **100 play/stop cycles without resource leaks**
  - Test runs 100 iterations of play→stop cycle
  - Memory usage remains stable (no unbounded growth)
  - No error accumulation
  
- [ ] **Subscriptions unsubscribed properly**
  - All RxJS subscriptions cleaned up on stop
  - No subscription leaks detectable
  - Test validates unsubscribe was called
  
- [ ] **yt-dlp processes always killed**
  - Process termination verified after each stop
  - No zombie processes remain
  - Process cleanup succeeds even on errors
  
- [ ] **No event listener leaks on player**
  - All AudioPlayer event listeners removed
  - VoiceConnection listeners cleaned up
  - Event emitter state validated
  
- [ ] **Test coverage >90% for lifecycle code**
  - Coverage report shows >90% for lifecycle-related files
  - Critical paths fully covered
  
- [ ] **Memory usage stable across cycles (manual verification)**
  - Visual inspection of memory usage shows flat profile
  - No significant growth over 100 cycles
  - Documented in test results

## Scope

### In Scope
- Unit tests for resource lifecycle management
- Subscription cleanup validation
- Process termination verification
- Event listener leak detection
- Memory stability testing (programmatic checks)
- Coverage measurement and reporting

### Out of Scope
- Integration tests with live Discord voice connections
- Performance benchmarking under load
- Production memory profiling tools
- Automated memory profiling (manual verification acceptable)
- Refactoring existing lifecycle code (test-only initiative)

## Technical Constraints
- **TypeScript strict mode**: All tests must compile with strict typing
- **Vitest framework**: Use existing test infrastructure
- **Mock dependencies**: Mock AudioPlayer, VoiceConnection, child processes
- **Deterministic tests**: Tests must be reliable and fast
- **No real processes**: Use mocks/stubs for yt-dlp processes

## Location
New test file: `src/djcova/tests/core/dj-cova.lifecycle.test.ts`

## Implementation Approach

### Test Structure
```typescript
describe('DJCova Resource Lifecycle', () => {
  describe('Subscription Management', () => {
    it('should unsubscribe all subscriptions on stop', () => { /* ... */ });
    it('should not leak subscriptions over multiple cycles', () => { /* ... */ });
  });
  
  describe('Process Management', () => {
    it('should kill yt-dlp process on stop', () => { /* ... */ });
    it('should handle process cleanup errors gracefully', () => { /* ... */ });
  });
  
  describe('Event Listener Management', () => {
    it('should remove all AudioPlayer listeners on stop', () => { /* ... */ });
    it('should remove all VoiceConnection listeners on stop', () => { /* ... */ });
  });
  
  describe('Lifecycle Stability', () => {
    it('should handle 100 play/stop cycles without leaks', () => { /* ... */ });
    it('should maintain stable memory usage', () => { /* ... */ });
  });
});
```

### Mocking Strategy
- **AudioPlayer**: Mock with event emitter tracking
- **VoiceConnection**: Mock with listener count tracking
- **ChildProcess**: Mock spawn/kill with verification
- **Subscriptions**: Track subscribe/unsubscribe calls

### Success Metrics
- Test coverage: >90% for lifecycle code
- All tests passing
- Zero flaky tests
- Fast execution (< 5 seconds total)

## Dependencies
- **Depends on:** #3 (Add Resource Lifecycle Management) - code must exist to test
- **Blocks:** Future stability improvements
- **Contributes to:** 80%+ coverage goal for DJCova

## Risks & Mitigation

### Risk 1: Tests may not catch real-world leaks
**Mitigation:** Combine unit tests with manual integration testing; document manual verification steps

### Risk 2: Mocking complexity may hide bugs
**Mitigation:** Keep mocks simple and realistic; validate mocks match real behavior

### Risk 3: Memory measurement may be unreliable in tests
**Mitigation:** Use programmatic checks where possible; manual verification for final validation

## Timeline
- **Phase 1: Test Setup** - 1 day
  - Create test file structure
  - Set up mocks and fixtures
  
- **Phase 2: Core Tests** - 2 days
  - Subscription cleanup tests
  - Process termination tests
  - Event listener tests
  
- **Phase 3: Stability Tests** - 1 day
  - 100-cycle test
  - Memory stability verification
  
- **Phase 4: Coverage & Review** - 1 day
  - Coverage analysis
  - Code review
  - Documentation

**Total estimate:** 4-5 days

## Workflow Status

### Phase 0: Git & PR Setup ✅
- Branch: `prd/574-djcova-resource-lifecycle-tests`
- Draft PR: Created
- Issue: Updated with progress

### Phase 1: Requirements Gathering 🔄
- Status: **IN PROGRESS**
- Owner: @pm
- PRD: This document

### Phase 2-9: Pending
- Architecture Review
- Implementation Planning
- Implementation
- Test Development
- Quality Validation
- Deployment
- Validation & Closure
- Retrospective

---

**Last Updated:** 2026-01-31  
**Status:** DRAFT - Requirements Gathering  
**Next Step:** Architecture review by @architect
