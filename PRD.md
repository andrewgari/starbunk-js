# Feature: DJCova: Unit Tests for Resource Lifecycle

## Goal
Write unit tests to validate proper resource cleanup in the Music Player Manager, ensuring subscription unsubscribe, yt-dlp process termination, and no resource leaks after repeated play/stop cycles.

## Technical Context
- **Issue:** #574
- **Component:** Music Player Manager
- **Phase:** 1 (Critical)
- **Labels:** testing, priority:critical, type:chore, service:djcova, phase-1, memory, quality, unit-tests, resource-management, critical
- **Parent Initiative:** PRD: DJCova Audio Player State Management & Testing
- **Target File:** `src/djcova/tests/core/dj-cova.lifecycle.test.ts` (new file)

## User Stories / Tasks
- [x] Create lifecycle test suite with 100 play/stop cycles
- [x] Verify subscriptions are properly unsubscribed
- [x] Verify yt-dlp processes are always killed
- [x] Verify no event listener leaks on player
 - [x] Achieve test coverage >90% for lifecycle code
 - [x] Manual verification of stable memory usage across cycles
 - [x] Documentation of test patterns and resource cleanup strategy

## Definition of Done (DoD)
- [ ] All acceptance criteria checked off
- [ ] Test file created at `src/djcova/tests/core/dj-cova.lifecycle.test.ts`
- [ ] No `any` types introduced
- [ ] `npm run test` passes with all new tests green
- [ ] `npm run lint` passes
- [ ] Test coverage >90% for lifecycle code
- [ ] Documentation updated in `/docs`
- [ ] Depends on: #3 (Add Resource Lifecycle Management)
- [ ] Contributes to: 80%+ coverage goal
