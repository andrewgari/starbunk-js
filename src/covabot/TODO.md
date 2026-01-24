# Covabot Task Manifest

Keep tasks scoped to Covabot. For cross-package work, add a brief entry in `docs/TASKS.md` linking here.

## Template

1. **Context**
   - Issue/User Story: <link>
2. **File Scope**
   - Absolute paths:
     - `/src/covabot/src/...`
     - `/src/shared/...` (if types or shared utils are impacted)
3. **The Change**
   - Describe logic and placement referencing existing patterns (e.g., commands/pipelines under `src/covabot/src/...`).
4. **Validation**
   - Tests: define `vitest` cases under `/src/covabot/tests/` and expected outcomes.
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
   - Issue/User Story: https://github.com/andrewgari/starbunk-js/issues/203 — Add persona-tuned response pipeline with configurable filters.
2. **File Scope**
   - `/src/covabot/src/pipeline/ResponsePipeline.ts` (new)
   - `/src/covabot/src/index.ts` (update: wire pipeline)
   - `/src/shared/types/llm.ts` (update: add `PipelineStepResult` type)
   - `/src/covabot/tests/pipeline/response-pipeline.test.ts` (new)
3. **The Change**
   - Implement a composable pipeline pattern under `src/covabot/src/pipeline` following existing shared patterns. Support filters for toxicity, length, and persona alignment.
4. **Validation**
   - Tests: Cases for in/out filtering, persona adjustments, and error handling. `vitest` in `src/covabot` must pass.
   - Repo Validations: `scripts/validation/run-all-validations.sh` returns success.
   - Tracing: Emit span `covabot.pipeline.run` with `steps`, `durationMs`, `filteredReasons` per `docs/observability/TRACING.md`.
   - Security: Snyk scan clean post-change; remediate issues and rescan as needed.
5. **Relationship**
   - @ts-sorcerer updating `/src/shared/types/llm.ts`.
   - @code-stylist reviewing naming and file placement.
   - @test-guard verifying coverage and trace assertions.
