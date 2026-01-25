# Context

Align shared paths and test aliases to avoid divergence between dist runtime and local tests.

# File Scope

- src/covabot/**
- src/shared/** (alias resolution)

# The Change

- Update `@starbunk/shared/database` alias to target `shared/dist/services/database` so container runtime resolves the built shared bundle.
- Align Vitest aliases to the same `shared/dist` paths to avoid divergence between tests and runtime.

# Validation

- Builds use dist paths without moduleResolution conflicts.
- Vitest loads ESM config and resolves aliases to dist consistently.

# Relationship

- @ts-sorcerer: confirm type-safe aliasing across packages.
- @code-stylist: verify consistent path usage.

# Tests

- Unit tests for services that import shared database modules pass using dist paths.

# Repo Validations

- Run `scripts/validation/run-all-validations.sh`.

# Tracing

- No new endpoints; ensure existing spans unaffected by path changes.

# Security

- No new dependencies; confirm Snyk clean and secrets untouched.
