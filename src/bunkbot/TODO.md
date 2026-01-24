# Bunkbot Task Manifest

Keep tasks scoped to Bunkbot. For cross-package work, add a brief entry in `docs/TASKS.md` linking here.

## Template

1. **Context**
   - Issue/User Story: <link>
2. **File Scope**
   - Absolute paths:
     - `/src/bunkbot/src/...`
     - `/src/shared/...` (if types or shared utils are impacted)
3. **The Change**
   - Describe logic and placement referencing existing patterns (e.g., strategy under `src/bunkbot/src/reactions`, factory registration in `index.ts`).
4. **Validation**
   - Tests: define `vitest` cases under `/src/bunkbot/tests/` and expected outcomes.
   - Repo Validations: `scripts/validation/run-all-validations.sh` must pass.
   - Tracing: emit spans for new operations per `docs/observability/TRACING.md` (e.g., `reaction.moderation.evaluate`).
   - Security: run Snyk scan for new/modified first-party JS/TS; fix findings per `.github/instructions/snyk_rules.instructions.md`.
5. **Relationship**
   - Agents/files with potential overlap and sequence dependencies.

## Checklist

- [ ] Context linked
- [ ] File paths listed
- [ ] Change described with references
- [ ] Tests specified and green
- [ ] Validations green
- [ ] Tracing verified
- [ ] Snyk scan clean
- [ ] Relationships noted

## Notes

Prefer workspace search/read for discovery. Terminal discovery is permitted via `execute` when needed (e.g., `grep`, `tree`).

---

## Example Entry

1. **Context**
   - Issue/User Story: https://github.com/andrewgari/starbunk-js/issues/202 — Add configurable moderation strategy for bunkbot reactions.
2. **File Scope**
   - `/src/bunkbot/src/reactions/moderation/ModerationStrategy.ts` (new)
   - `/src/bunkbot/src/reactions/index.ts` (update: strategy registration)
   - `/src/shared/types/reactions.ts` (update: add `ModerationDecision` type)
   - `/src/bunkbot/tests/reactions/moderation.test.ts` (new)
3. **The Change**
   - Implement Strategy Pattern under `src/bunkbot/src/reactions/moderation` consistent with existing factory usage in `src/shared`. Expose a registration hook in `index.ts` and extend shared types.
4. **Validation**
   - Tests: Define cases for allow/deny/escalate. Run `vitest` in `src/bunkbot` and ensure all pass.
   - Repo Validations: `scripts/validation/run-all-validations.sh` returns success.
   - Tracing: Emit span `reaction.moderation.evaluate` with attributes `reactionType`, `userId`, `decision` per `docs/observability/TRACING.md`.
   - Security: Snyk scan shows no new issues after changes; fix findings and rescan.
5. **Relationship**
   - @ts-sorcerer updating `/src/shared/types/reactions.ts`.
   - @code-stylist reviewing naming and file placement.
   - @test-guard verifying coverage and trace assertions.
