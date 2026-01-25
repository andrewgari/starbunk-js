# Task Manifests Index

This index tracks active work across packages and standardizes the manifest structure for zero-ambiguity handoffs.

Each package keeps a local `TODO.md` for scoped work. Cross-package tasks are listed here with links to the package manifests.

## Manifest Template (Required)

Every task delegation MUST include:

1. **Context**: Link to the GitHub Issue or User Story.
2. **File Scope**: Absolute paths to files to read/modify.
3. **The Change**: High-level logic description, referencing existing patterns (e.g., Strategy/Factory placement).
4. **Validation**:
   - Tests: `vitest` unit/integration cases defined and passing in affected package.
   - Repo Validations: naming, docs, temp files via `scripts/validation/run-all-validations.sh`.
   - Tracing: spans emitted per `docs/observability/TRACING.md` for new endpoints/ops.
   - Security: Snyk scan for newly introduced/modified first-party JS/TS code; fix findings and rescan until clean per `.github/instructions/snyk_rules.instructions.md`.
5. **Relationship**: Related agents and files to avoid merge conflicts.

See `.github/agents/master-architect.agent.md` for the full protocol and lifecycle gates.

## Discovery Aids

Prefer workspace `search` and `read` first. When necessary, terminal discovery is permitted:

```sh
# Structure overview (excluding noisy dirs)
tree -I node_modules -L 2

# Type and strategy references
grep -R "interface .*Strategy" -n src/ shared/
grep -R "export type .*" -n src/shared
```

## Active Tasks

- Root version sync lockfile suppression
  - Context: issue/525-clean
  - File Scope: [scripts/sync-versions.sh](scripts/sync-versions.sh)
  - The Change: replace `npm version` calls with a direct JSON edit to update `version` without touching the lockfile
  - Validation: no new tests; verify pre-commit no longer rewrites the lockfile; Snyk not needed (no JS/TS changes)
  - Relationship: none currently

Add cross-package tasks here with a short summary and a link to the package-local manifest entries.
