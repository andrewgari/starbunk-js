# Bluebot Task Manifest

Keep tasks scoped to Bluebot. For cross-package work, add a brief entry in `docs/TASKS.md` linking here.

## Template

1. **Context**
   - Issue/User Story: <link>
2. **File Scope**
   - Absolute paths:
     - `/src/bluebot/src/...`
     - `/src/shared/...` (if types or shared utils are impacted)
3. **The Change**
   - Describe logic and placement referencing existing patterns (e.g., factory/strategy in `src/bluebot/src/...` or shared patterns in `src/shared`).
4. **Validation**
   - Tests: define `vitest` cases under `/src/bluebot/tests/` and expected outcomes.
   - Repo Validations: `scripts/validation/run-all-validations.sh` must pass.
   - Tracing: add spans for new operations per `docs/observability/TRACING.md` (where applicable).
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
   - Issue/User Story: https://github.com/andrewgari/starbunk-js/issues/201 — Enhance Blue detection heuristics for composite phrases.
2. **File Scope**
   - `/src/bluebot/src/detection/BlueDetector.ts` (update: heuristics)
   - `/src/bluebot/src/index.ts` (update: detector registration if needed)
   - `/src/shared/types/blue.ts` (update: add `DetectionDetail` type)
   - `/src/bluebot/tests/detection/blue-detector.test.ts` (new)
3. **The Change**
   - Extend detection rules to handle composite phrases and contextual negations using existing pattern-matching utility in `src/shared`. Maintain current strategy layout and avoid breaking exports.
4. **Validation**
   - Tests: Cases for simple, composite, and negated phrases. `vitest` in `src/bluebot` must pass.
   - Repo Validations: `scripts/validation/run-all-validations.sh` returns success.
   - Tracing: Emit span `blue.detector.evaluate` with `phrase`, `confidence`, `matchedRules` per `docs/observability/TRACING.md`.
   - Security: Post-change Snyk scan shows no new issues; remediate and rescan as needed.
5. **Relationship**
   - @ts-sorcerer updating shared types in `/src/shared/types/blue.ts`.
   - @code-stylist reviewing naming and file placement.
   - @test-guard verifying test coverage and trace assertions.
