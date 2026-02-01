# PRD: DJCova Audio Player State Management & Testing

## Executive Summary
DJCova has an 80% failure rate in production. Users experience chronic disconnections and stream failures that regress frequently. Root cause: combination of type safety bugs, missing connection validation, and **zero test coverage**. This initiative fixes the core issues AND adds integration tests to prevent regression.

## Problem Statement
For a small but critical user base (~12 users), djcova is unusable 80% of the time. Issues keep regressing because there's no test coverage to catch them. This blocks users from basic music playback functionality.

**Current Symptoms:**
- Audio stream fails to establish
- Voice connection drops silently
- Resource leaks (orphaned processes)
- Idle manager doesn't track actual playback
- Issues regress after fixes due to lack of test coverage

## DJCova Critical Components (North Star)

**These are the core responsibilities that must be rock-solid:**

1. **Music Player Manager** – Play/pause/stop audio streams with proper state tracking
2. **YouTube Audio Stream Fetcher** – Reliably fetch audio streams from YouTube (yt-dlp wrapper)
3. **Voice Connection Manager** – Connect to voice channels, validate readiness, clean up gracefully
4. **Idle Manager** – Auto-disconnect when idle, track actual playback state
5. **Volume Manager** – Set/adjust volume without dropping connection
6. **Command-Driven Execution** – Handle user commands safely through Discord interactions

## Root Causes (Mapped to Components)

**Music Player Manager:**
- Type safety bug: `this.player` reassigned as `AudioResource` instead of `AudioPlayerLike` ❌
- No state machine to prevent invalid transitions ❌
- Resource leaks from orphaned subscriptions ❌

**Voice Connection Manager:**
- No connection readiness validation gate ❌
- Silent connection failures with no recovery ❌

**YouTube Audio Stream Fetcher:**
- No retry logic for transient failures ❌
- Process cleanup issues ❌

**Idle Manager:**
- Doesn't track actual playback state, only event transitions ❌

**Across All Components:**
- Zero integration/E2E test coverage = regressions inevitable ❌

## Proposed Solution

### Code Fixes
- Add `PlayerState` state machine (idle → connecting → playing → stopping)
- Require connection `Ready` before player attachment
- Proper resource cleanup with subscription management
- 3-attempt exponential backoff retry (1s/2s/4s)
- Connection health monitor (5s interval, auto-recover)
- Idle manager state integration

### Test Coverage (NEW)
- Unit tests for state machine transitions
- Integration tests for voice connection + audio resource lifecycle
- **E2E tests**: Actual YouTube audio playback validation
  - Mock yt-dlp responses
  - Validate audio data flows through resource pipeline
  - Test stream interruption/reconnection scenarios
  - Test cleanup doesn't leak resources
- Edge case tests (invalid URLs, timeouts, network failures)

#### Lifecycle Test Patterns & Resource Cleanup Strategy

- **Lifecycle stress test** at `src/djcova/tests/core/dj-cova.lifecycle.test.ts` runs 100 sequential play/stop cycles against the Music Player Manager using mocked yt-dlp streams and asserts that every spawned process has `kill('SIGKILL')` invoked.
- **Audio player listener leak detection** in the same suite tracks `AudioPlayerStatus.Playing`, `AudioPlayerStatus.Idle`, and `error` listener counts and asserts they remain stable across cycles to catch EventEmitter leaks.
- **Voice connection subscription tests** in `src/djcova/tests/voice-utils.subscription.test.ts` verify that `disconnectVoiceConnection` unsubscribes all `VoiceConnection` event handlers and that idle/disconnect flows clean up subscriptions.
- **yt-dlp unit tests** in `src/djcova/tests/ytdlp.unit.test.ts` cover process error handling, stderr logging, and ensure spawned yt-dlp processes are killed with `kill('SIGKILL')` when cleanup is required.
- New lifecycle-focused tests follow an Arrange-Act-Assert (AAA) pattern and prefer observer-style assertions on events and resource cleanup points; future tests for DJCova lifecycle behavior should follow the same structure.

## Acceptance Criteria (Per Component)

### Music Player Manager
- [ ] Type safety: No `any` types, proper `AudioPlayer` vs `AudioResource` distinction
- [ ] State machine (idle → connecting → playing → stopping) prevents invalid transitions
- [ ] Zero resource leaks after 100 play/stop cycles
- [ ] Play/stop commands execute reliably 95%+ of the time
- [ ] Unit test coverage >80% for state transitions and lifecycle

### YouTube Audio Stream Fetcher
- [ ] Retry logic (3 attempts, exponential backoff 1s/2s/4s) for transient failures
- [ ] yt-dlp process cleanup never leaves zombie processes
- [ ] Handles yt-dlp timeouts gracefully (20s max per attempt)
- [ ] Integration tests mock yt-dlp responses successfully
- [ ] E2E tests validate actual YouTube audio streams

### Voice Connection Manager
- [ ] Connection readiness gate: Waits for `Ready` status before player attachment
- [ ] Connection failures auto-recover within 5 seconds
- [ ] No orphaned connections after stop/disconnect
- [ ] Integration tests validate full connection lifecycle
- [ ] Edge case tests: Channel permissions, network interruption, reconnection scenarios

### Idle Manager
- [ ] Tracks actual playback state (not just events)
- [ ] Auto-disconnect on idle works reliably
- [ ] Doesn't falsely disconnect during active playback
- [ ] Unit tests validate state integration with Music Player Manager

### Volume Manager
- [ ] Volume changes don't interrupt playback
- [ ] Proper cleanup of volume resources
- [ ] Unit tests validate volume state and resource lifecycle

### Command-Driven Execution
- [ ] User commands don't block Discord interactions
- [ ] Error messages are clear and actionable
- [ ] Integration tests validate full command pipeline

### Overall Quality
- [ ] Snyk scan clean (no security issues)
- [ ] Stream establishment succeeds 95%+ of the time (target: reduce 80% failure to <5%)
- [ ] No user-visible delay on retry (silent backoff)
- [ ] 0 disconnects over 1 week of normal usage

## Scope

### In Scope (Mapped to Components)

**Music Player Manager:**
- Fix type safety bug (`this.player` reassignment)
- Add `PlayerState` state machine
- Implement resource lifecycle management (cleanup subscriptions properly)
- Unit tests for state transitions

**YouTube Audio Stream Fetcher:**
- Implement 3-attempt retry logic with exponential backoff
- Improve yt-dlp process cleanup
- Integration tests with mocked yt-dlp
- E2E tests with real YouTube audio

**Voice Connection Manager:**
- Implement connection readiness gate (wait for `Ready`)
- Add connection health monitor (5s interval, auto-recover)
- Integration tests for full connection lifecycle
- Edge case tests (permissions, interruption, reconnection)

**Idle Manager:**
- Integrate with Music Player Manager state machine
- Ensure state tracking is accurate
- Unit tests for state integration

**Volume Manager:**
- Ensure resource cleanup is properly integrated
- Unit tests for volume state management

**Overall:**
- Comprehensive test coverage (>80% on critical components)
- Snyk security scan

### Out of Scope (Future Initiatives)
- Queue system
- Playlist support
- Advanced audio processing/effects
- Equalizer/audio filters
- Now-playing embeds/rich status

## Technical Constraints
- Must use TypeScript strict mode
- Must handle yt-dlp timeouts gracefully (20s max per attempt)
- Must not block Discord interaction handling
- Tests must run in CI without real YouTube API calls (mock yt-dlp)
- Health checks shouldn't spike CPU/memory on Unraid

## Success Metrics
- **User-facing**: 0 disconnects over 1 week of normal usage (vs current ~10+)
- **Reliability**: 95%+ stream establishment success (measured over 50+ plays)
- **Latency**: Stream establishment <3s
- **Code quality**: 80%+ test coverage on `dj-cova.ts` and `voice-utils.ts`
- **Regression prevention**: No similar issues in next 2 months

## Timeline (Organized by Component Priority)

**Phase 1: Music Player Manager (Critical)** – 2-3 hrs
- Fix type safety bug
- Add PlayerState state machine
- Add resource lifecycle management
- Unit tests for state + lifecycle

**Phase 2: Voice Connection Manager (Critical)** – 2-3 hrs
- Implement connection readiness gate
- Add connection health monitor
- Integration tests for connection lifecycle
- Edge case tests (permissions, network, reconnect)

**Phase 3: YouTube Audio Stream Fetcher (High)** – 2-3 hrs
- Implement retry logic
- Improve process cleanup
- Integration tests with mocked yt-dlp
- E2E tests with real YouTube audio
- Edge case tests (invalid URLs, timeouts, interruption)

**Phase 4: Cross-Component Integration (High)** – 1-2 hrs
- Idle manager state tracking integration
- Full playback pipeline integration tests
- Edge case testing across components

**Phase 5: Validation & Security (Medium)** – 1 hr
- Manual testing (50+ plays, verify 95%+ success)
- Snyk security scan
- Final cleanup

**Total: ~8-12 hours (realistic for comprehensive testing)**

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| Retry delay frustrates users | Auto-silent retry, no user-facing prompts unless final failure |
| Tests are flaky (yt-dlp timeouts) | Mock yt-dlp responses, use synthetic audio streams for E2E |
| State machine is too rigid | Start with simple machine, refactor if needed |
| Health monitor is noisy | Test thresholds before deployment, allow 1 false positive |

## Files to Touch
- `src/djcova/src/core/dj-cova.ts` (state machine, resource mgmt)
- `src/djcova/src/utils/voice-utils.ts` (connection validation)
- `src/djcova/src/services/idle-manager.ts` (state integration)
- `src/djcova/src/services/dj-cova-service.ts` (service layer updates)
- `src/djcova/tests/*.test.ts` (new comprehensive test suite)

## Dependencies
- Depends on: `@discordjs/voice`, `yt-dlp`, `discord.js`
- Blocks: Nothing immediate, but blocks future features (queue, playlist)

## Deliverables Breakdown (for tasking)

### Music Player Manager (Core)
1. **Fix Type Safety Bug** – `this.player` should never be reassigned as `AudioResource`
2. **Add PlayerState State Machine** – Prevent invalid transitions (idle → connecting → playing → stopping)
3. **Add Resource Lifecycle Management** – Proper cleanup of subscriptions, no leaks
4. **Unit Tests: State Machine** – All transitions, invalid state rejection
5. **Unit Tests: Lifecycle** – Resource cleanup after 100 play/stop cycles

### Voice Connection Manager
6. **Implement Connection Readiness Gate** – Wait for `Ready` status before player attachment
7. **Add Connection Health Monitor** – 5s interval checks, auto-recover on failure
8. **Integration Tests: Connection Lifecycle** – Join, ready, subscribe, disconnect
9. **Edge Case Tests** – Permissions denied, network interruption, reconnection

### YouTube Audio Stream Fetcher
10. **Implement Retry Logic** – 3 attempts with exponential backoff (1s/2s/4s)
11. **Improve Process Cleanup** – No zombie yt-dlp processes
12. **Integration Tests: Stream Fetching** – Mock yt-dlp responses, validate pipeline
13. **E2E Tests: YouTube Audio** – Real YouTube fetch + audio validation
14. **Edge Case Tests** – Invalid URLs, yt-dlp timeouts, stream interruption

### Idle Manager Integration
15. **Integrate State Tracking** – Connect to Music Player Manager state machine
16. **Unit Tests: Idle State** – Accurate state tracking, auto-disconnect logic

### Cross-Component
17. **Write Integration Tests** – Full playback pipeline (connect → fetch → play → idle → disconnect)
18. **Snyk Security Scan** – Fix any issues, ensure clean scan
19. **Final Validation** – Manual testing over 50+ plays, verify 95%+ success rate
