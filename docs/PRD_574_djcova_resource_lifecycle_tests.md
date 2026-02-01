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
- Additional tests for initialization, playback start, and stream handling paths required to reach >90% coverage

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

### Phase 1: Requirements Gathering ✅
- Status: **COMPLETE**
- Owner: @pm
- PRD: This document

### Phase 2: Architecture Review ✅
- Status: **COMPLETE**
- Owner: @architect
- Review completed: 2026-01-31
- Sign-off: **APPROVED with specifications below**

### Phase 3: Implementation Planning ✅
- Status: **COMPLETE**
- Owner: @senior-engineer

### Phase 4: Implementation ✅
- Status: **COMPLETE**
- Owner: @grunt-worker

### Phase 5: Test Development ✅
- Status: **COMPLETE** (coverage 95.06% achieved)
- Owner: @test-engineer

### Phase 6: Quality Validation 🔄
- Status: **READY** (coverage target achieved)
- Owner: @qa-engineer

### Phase 7-9: Pending
- Deployment
- Validation & Closure
- Retrospective

---

**Last Updated:** 2026-01-31
**Status:** COVERAGE TARGET ACHIEVED
**Next Step:** Quality validation by @qa-engineer

**Phase Status:**
- ✅ Phase 0: Git & PR Setup - COMPLETE
- ✅ Phase 1: Requirements Gathering - COMPLETE
- ✅ Phase 2: Architecture Review - COMPLETE
- ✅ Phase 3: Implementation Planning - COMPLETE
- ✅ Phase 4: Implementation - COMPLETE
- ✅ Phase 5: Test Development - COMPLETE (coverage 95.06% achieved)
- 🔄 Phase 6: Quality Validation - READY

---

## Decision Log
- **2026-01-31:** User confirmed >90% coverage target is required. Expand test scope to include initialization, playback start, and stream handling paths needed to reach target coverage.
- **2026-01-31:** Coverage expansion tests implemented; `dj-cova.ts` coverage reached 95.06%.

---

## Architecture Review

**Reviewer:** @architect
**Date:** 2026-01-31
**Status:** ✅ APPROVED

### Executive Summary
The proposed test structure is **architecturally sound** and aligns with existing DJCova patterns. The test file already exists with good coverage of lifecycle concerns. This review provides specifications to enhance and complete the test suite to meet all PRD acceptance criteria.

### 1. Test Structure & Organization

**Current State:**
- Test file exists: `src/djcova/tests/core/dj-cova.lifecycle.test.ts`
- Complementary coverage in: `src/djcova/tests/memory-leak-prevention.test.ts`
- Infrastructure: Vitest with v8 coverage provider
- Pattern: Direct unit testing with mocked dependencies

**Architectural Decision:**
✅ **APPROVED** - Current structure follows established patterns:
- Located in `tests/core/` alongside state machine tests
- Uses Vitest (project standard)
- Follows existing mock patterns from `voice-utils.subscription.test.ts`

**Required Enhancements:**
1. **Consolidate lifecycle concerns** - Current tests are split across two files. Keep both but ensure clear separation:
   - `dj-cova.lifecycle.test.ts` → Focus on **100-cycle stability and process cleanup**
   - `memory-leak-prevention.test.ts` → Focus on **event listener cleanup on destroy()**

2. **Add subscription tracking test** - Currently missing explicit subscription cleanup verification in lifecycle test. Must add test that validates `currentSubscription.unsubscribe()` is called.

### 2. Mocking Strategy

**Current Implementation Review:**
```typescript
// ✅ GOOD: yt-dlp mocked at module level
vi.mock('../../src/utils/ytdlp', () => ({
  getYouTubeAudioStream: vi.fn(() => ({
    stream: new PassThrough(),
    process: { kill: vi.fn() },
  })),
}));

// ✅ GOOD: demuxProbe stubbed to avoid ESM limitations
vi.mock('@discordjs/voice', async importOriginal => {
  const actual = await importOriginal<typeof import('@discordjs/voice')>();
  return {
    ...actual,
    demuxProbe: vi.fn(async (stream: unknown) => ({
      stream,
      type: actual.StreamType.Opus,
    })),
  };
});
```

**Architectural Decision:**
✅ **APPROVED** - Mocking strategy is correct:
- Module-level mocks prevent real process spawning
- PassThrough stream is lightweight and appropriate
- demuxProbe mock avoids real stream probing
- kill() mock enables verification

**Required Enhancements:**
1. **Add subscription mock tracking** - Current implementation uses real AudioPlayer which doesn't expose subscription state. Add test that:
   - Calls `setSubscription()` with a mock subscription
   - Verifies `unsubscribe()` is called during cleanup

2. **Track process kill calls per cycle** - Current test verifies all 100 processes were killed but doesn't validate they were killed in the correct order or timing. This is acceptable for unit tests.

### 3. Resource Measurement Approach

**Current Implementation:**
```typescript
// Event listener leak detection
const initialListenerCount =
  audioPlayer.listenerCount(AudioPlayerStatus.Playing) +
  audioPlayer.listenerCount(AudioPlayerStatus.Idle) +
  audioPlayer.listenerCount('error');

// ... 100 cycles ...

const finalListenerCount =
  audioPlayer.listenerCount(AudioPlayerStatus.Playing) +
  audioPlayer.listenerCount(AudioPlayerStatus.Idle) +
  audioPlayer.listenerCount('error');

expect(finalListenerCount).toBe(initialListenerCount);
```

**Architectural Decision:**
✅ **APPROVED** - Listener count tracking is the correct approach for unit tests:
- Direct measurement via EventEmitter API
- No external tooling required
- Fast and deterministic
- Matches Node.js best practices

**Memory Leak Detection:**
- ❌ **NOT FEASIBLE** in unit tests - Real memory profiling requires integration tests
- ✅ **APPROVED ALTERNATIVE** - Programmatic checks only:
  1. Listener count stability (already implemented)
  2. Subscription cleanup verification (needs addition)
  3. Process kill verification (already implemented)
  4. Resource nulling verification (needs addition)

**Required Additions:**
```typescript
// Add test to verify resource cleanup
it('should clear all references after 100 cycles', async () => {
  const djCovaAny = djCova as any;

  for (let i = 0; i < 100; i += 1) {
    await djCova.play(testUrl);
    djCova.stop();
  }

  // Verify cleanup state
  expect(djCovaAny.currentResource).toBeUndefined();
  expect(djCovaAny.ytdlpProcess).toBeNull();
  expect(djCovaAny.currentSubscription).toBeUndefined();
});
```

### 4. Technical Constraints & Patterns

**Identified Patterns from Codebase:**

1. **Cleanup Guards** (from `dj-cova.ts:171`):
   ```typescript
   if (this.isCleaningUp) {
     logger.debug('Cleanup already in progress, skipping');
     return;
   }
   ```
   ✅ Tests must verify concurrent cleanup calls don't cause issues

2. **Ordered Cleanup** (from `dj-cova.ts:177-209`):
   - Step 1: Unsubscribe subscription
   - Step 2: Kill yt-dlp process
   - Step 3: Clear resource reference

   ✅ Tests should verify this order is maintained

3. **Error Handling in Cleanup** (from `dj-cova.ts:183`):
   ```typescript
   try {
     this.currentSubscription.unsubscribe();
   } catch (error) {
     logger.warn('Error unsubscribing...');
   }
   ```
   ✅ Tests must verify cleanup continues even if individual steps fail

**Technical Constraints:**
- ✅ TypeScript strict mode: All tests compile with `strict: true`
- ✅ Vitest framework: Using project standard
- ✅ No `any` types: Test uses type assertion `(djCova as any)` only for private access
- ✅ Mock dependencies: All external dependencies mocked
- ✅ Deterministic: No timing dependencies or race conditions

### 5. Integration Points

**Existing Test Infrastructure:**
```typescript
// vitest.config.ts patterns
✅ Uses v8 coverage provider
✅ Coverage includes src/**/*.ts
✅ Excludes test files from coverage
✅ Node environment (correct for voice connections)
```

**Integration with DJCova Code:**
- ✅ Tests the public API: `play()`, `stop()`, `destroy()`
- ✅ Tests use real `DJCova` class with mocked dependencies
- ✅ Compatible with existing state machine tests in `dj-cova.state-machine.test.ts`
- ⚠️ **Gap:** No integration with `DJCovaService.setSubscription()` flow

**Required Integration Test:**
```typescript
// Verify subscription lifecycle matches service usage pattern
it('should handle subscription lifecycle like DJCovaService', async () => {
  const mockSubscription = {
    unsubscribe: vi.fn(),
  };

  djCova.setSubscription(mockSubscription as any);
  await djCova.play(testUrl);
  djCova.stop();

  expect(mockSubscription.unsubscribe).toHaveBeenCalled();
});
```

### 6. Coverage Analysis

**Current Coverage Gaps:**
1. ❌ Subscription cleanup verification
2. ❌ Resource nulling verification
3. ❌ Concurrent cleanup guard testing
4. ✅ Process termination (covered)
5. ✅ Event listener stability (covered)
6. ✅ 100-cycle stability (covered)

**Path to >90% Coverage:**
- Current lifecycle code: ~75 lines in `cleanup()` and `destroy()`
- Current test coverage: ~60% of lifecycle code
- Required additions: 4 new test cases (specified below)
- Projected coverage: >90%

### Technical Specifications for @senior-engineer

**Task 1: Add Subscription Cleanup Test**
```typescript
describe('Subscription Management', () => {
  it('should unsubscribe from player subscription on stop', async () => {
    const mockSubscription = {
      unsubscribe: vi.fn(),
    };

    djCova.setSubscription(mockSubscription as any);
    await djCova.play(testUrl);
    djCova.stop();

    expect(mockSubscription.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe on every stop cycle', async () => {
    const subscriptions = Array.from({ length: 10 }, () => ({
      unsubscribe: vi.fn(),
    }));

    for (let i = 0; i < 10; i += 1) {
      djCova.setSubscription(subscriptions[i] as any);
      await djCova.play(testUrl);
      djCova.stop();
      expect(subscriptions[i].unsubscribe).toHaveBeenCalledTimes(1);
    }
  });
});
```

**Task 2: Add Resource Nulling Test**
```typescript
describe('Resource Cleanup', () => {
  it('should clear all resource references after stop', async () => {
    const djCovaAny = djCova as any;

    await djCova.play(testUrl);
    expect(djCovaAny.currentResource).toBeDefined();
    expect(djCovaAny.ytdlpProcess).not.toBeNull();

    djCova.stop();
    expect(djCovaAny.currentResource).toBeUndefined();
    expect(djCovaAny.ytdlpProcess).toBeNull();
  });
});
```

**Task 3: Add Concurrent Cleanup Guard Test**
```typescript
describe('Cleanup Safety', () => {
  it('should prevent concurrent cleanup calls', async () => {
    await djCova.play(testUrl);

    // Trigger cleanup multiple times simultaneously
    const cleanupPromises = Array.from({ length: 5 }, () =>
      new Promise<void>(resolve => {
        djCova.stop();
        resolve();
      })
    );

    await Promise.all(cleanupPromises);

    // Verify process kill was only called once per play
    const mockedGetYouTubeAudioStream = getYouTubeAudioStream as unknown as any;
    const lastResult = mockedGetYouTubeAudioStream.mock.results[
      mockedGetYouTubeAudioStream.mock.results.length - 1
    ];
    expect(lastResult.value.process.kill).toHaveBeenCalledTimes(1);
  });
});
```

**Task 4: Add Cleanup Error Handling Test**
```typescript
describe('Cleanup Error Handling', () => {
  it('should continue cleanup even if subscription unsubscribe throws', async () => {
    const mockSubscription = {
      unsubscribe: vi.fn(() => { throw new Error('Unsubscribe failed'); }),
    };

    djCova.setSubscription(mockSubscription as any);
    await djCova.play(testUrl);

    // Should not throw
    expect(() => djCova.stop()).not.toThrow();

    // Process should still be killed
    const mockedGetYouTubeAudioStream = getYouTubeAudioStream as unknown as any;
    const lastResult = mockedGetYouTubeAudioStream.mock.results[
      mockedGetYouTubeAudioStream.mock.results.length - 1
    ];
    expect(lastResult.value.process.kill).toHaveBeenCalled();
  });
});
```

### Success Criteria Verification

| Acceptance Criteria | Status | Notes |
|---------------------|--------|-------|
| 100 play/stop cycles without leaks | ✅ Implemented | In `dj-cova.lifecycle.test.ts` |
| Subscriptions unsubscribed properly | ⚠️ Partial | Need explicit verification (Task 1) |
| yt-dlp processes always killed | ✅ Implemented | Verified in 100-cycle test |
| No event listener leaks | ✅ Implemented | Verified in 100-cycle test |
| Test coverage >90% | ⚠️ Pending | Will achieve with Tasks 1-4 |
| Memory usage stable | ⚠️ Manual | Programmatic checks only |

### Risks & Mitigations

**Risk 1: Subscription cleanup may fail silently**
- **Mitigation:** Task 1 explicitly verifies `unsubscribe()` calls
- **Severity:** Low (caught by new tests)

**Risk 2: Real memory leaks undetectable in unit tests**
- **Mitigation:** Manual integration testing documented in runbook
- **Severity:** Medium (acceptable for Phase 1)

**Risk 3: Concurrent cleanup edge cases**
- **Mitigation:** Task 3 validates cleanup guard
- **Severity:** Low (guard already implemented)

### Deployment Considerations

**No Infrastructure Changes Required:**
- Tests run in existing Vitest infrastructure
- Coverage reports generated automatically
- No new dependencies needed
- No CI/CD modifications required

### Sign-Off

**Architectural Approval:** ✅ APPROVED

**Conditions:**
1. Implement Tasks 1-4 specified above
2. Maintain >90% coverage for lifecycle code
3. All tests must pass with zero flaky behavior
4. Document manual memory validation in RUNBOOK.md

**Next Phase:**
@senior-engineer: Review this architecture specification and create detailed implementation tasks for @grunt-worker. Break down Tasks 1-4 into specific file edits and report back when ready to implement.

---

## Architecture Review Addendum: Coverage Expansion

**Reviewer:** @architect
**Date:** 2026-01-31
**Status:** ✅ APPROVED (Addendum)

### Executive Summary
Coverage expansion is required to reach the >90% target. Add tests for initialization, playback start, stream handling, and error/cleanup branches in `dj-cova.ts`.

### Coverage Targets (Uncovered Paths)
- Initialization paths (lines 34–38)
- Audio player setup handlers (lines 65–66, 70–71, 75–76)
- Playback start logic (lines 101–105)
- Stream handling and probe error paths (lines 116–125)
- Core playback logic (lines 146–164)
- Error handling branches (lines 170–171)
- Cleanup paths (line 196)

### Required Test Areas
1. **Constructor + player configuration**: verify FFMPEG_PATH default and `createAudioPlayer` config
2. **Audio player event handling**: `Playing`/`Idle` handlers call idle manager methods
3. **Play happy path**: stream probe, resource creation, player play
4. **Volume application**: `setVolume` applies expected scaling
5. **Play error path**: `demuxProbe` failure triggers cleanup and rethrows
6. **Stop ordering**: cleanup invoked before `player.stop()`
7. **Player error event**: handler calls `cleanup()`
8. **Destroy cleanup**: stops, destroys idle manager, removes listeners

### Example Test Sketches (abbreviated)
```typescript
it('initializes player config and default FFMPEG_PATH', () => {
  delete process.env.FFMPEG_PATH;
  const djCova = new DJCova();
  expect(process.env.FFMPEG_PATH).toBeDefined();
  expect(createAudioPlayer).toHaveBeenCalledWith({
    behaviors: { noSubscriber: NoSubscriberBehavior.Play },
  });
});

it('resets idle timer on Playing and starts on Idle', () => {
  const djCova = new DJCova();
  const idleManager = { resetIdleTimer: vi.fn(), startIdleTimer: vi.fn(), destroy: vi.fn() };
  (djCova as { idleManager: typeof idleManager }).idleManager = idleManager;
  const player = djCova.getPlayer();
  (player as EventEmitter).emit(AudioPlayerStatus.Playing);
  (player as EventEmitter).emit(AudioPlayerStatus.Idle);
  expect(idleManager.resetIdleTimer).toHaveBeenCalledTimes(1);
  expect(idleManager.startIdleTimer).toHaveBeenCalledTimes(1);
});

it('rethrows probe errors and cleans up', async () => {
  const djCova = new DJCova();
  (demuxProbe as Mock).mockRejectedValue(new Error('probe failed'));
  await expect(djCova.play('https://example')).rejects.toThrow('probe failed');
  const djCovaAny = djCova as { ytdlpProcess: ChildProcess | null; currentResource?: unknown };
  expect(djCovaAny.ytdlpProcess).toBeNull();
  expect(djCovaAny.currentResource).toBeUndefined();
});
```

### Mock Enhancements Required
- **AudioPlayer mock**: EventEmitter-based stub with `play`, `stop`, `removeAllListeners`, `emit`
- **createAudioResource**: return object with optional `volume.setVolume`
- **demuxProbe**: success + failure paths
- **getYouTubeAudioStream**: success + failure paths
- **Idle manager fixture**: `resetIdleTimer`, `startIdleTimer`, `destroy`

### Edge Cases to Cover
- Init with missing `FFMPEG_PATH` (default set)
- `demuxProbe` failure should rethrow and clean up
- Player `error` event triggers `cleanup()`
- `destroy()` removes listeners and clears idle manager

### Expected Coverage Impact
These tests should cover the remaining branches and lift `dj-cova.ts` coverage from ~65% to **≥92%**.

### Next Phase
@senior-engineer: Produce an updated implementation plan for the coverage expansion tests and hand off to @grunt-worker.
