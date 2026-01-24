# DJCova Task Manifest

Keep tasks scoped to DJCova. For cross-package work, add a brief entry in `docs/TASKS.md` linking here.

## Template

1. **Context**
   - Issue/User Story: <link>
2. **File Scope**
   - Absolute paths:
     - `/src/djcova/src/...`
     - `/src/shared/...` (if types or shared utils are impacted)
3. **The Change**
   - Describe logic and placement referencing existing patterns (e.g., commands/services under `src/djcova/src/...`).
4. **Validation**
   - Tests: define `vitest` cases under `/src/djcova/tests/` and expected outcomes.
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

## Current Tasks

(None defined yet)
