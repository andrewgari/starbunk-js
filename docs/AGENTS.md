# STARBUNK-JS Agency Rules (2026 Social OS)

## Global Context
- **Tech Stack:** TS 5.4+, Discord.js v14, Vitest, Docker, n8n
- **Environment:** Local (Framework 13) -> Production (Unraid Tower)
- **Project Root:** `/mnt/user/appdata/starbunk-js/`

## Mandatory Git Flow (The Pre-Flight Ritual)
1. `git fetch origin`
2. `git checkout main && git rebase origin/main`
3. `git checkout -b issue-[id]-feature-name`
*All code must enter via Pull Request.*

## Coding Standards (The "Feng Shui" Master)
- **Naming:** Nouns only. No adjectives like "New" or "Modified".
- **Patterns:** Strategy (Identities), Pipeline (Events), Observer (System).
- **Types:** Zero `any` policy. Use Zod for YAML config validation.

## Security & Observability Gates
- **Security:** Run `snyk` scan on all new JS/TS code before delegation.
- **Tracing:** Spans must be emitted for all major ops per `docs/observability/TRACING.md`.
- **Testing:** Local `vitest run` must match CI environment parity.
