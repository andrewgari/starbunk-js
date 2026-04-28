# Shared - Development Instructions

> **Releasing:** Any change to `src/shared/src/` requires a changeset. Run `npm run cs` from the repo root before committing. Pick `@starbunk/shared`, choose `patch`/`minor`/`major`, write one line. See [[../../wiki/raw/Versioning|Versioning Guide]].
>
> Shared changes do **not** auto-bump app versions. Apps only get a new version when they have their own changeset.

## Goals & Purpose

`@starbunk/shared` is the internal shared library for all four Starbunk containers. It provides:

- **Observability** — OpenTelemetry tracing, Prometheus metrics, structured logging (LogLayer + Pino)
- **Health checks** — HTTP health server, smoke-test mode, bot activity tracking
- **Discord services** — base `DiscordService`, `WebhookService`, `CommandRegistry`
- **Database** — `PostgresService`, `BaseRepository`, `PostgresBaseRepository`
- **LLM providers** — `LlmProviderManager`, OpenAI, Ollama, Gemini, Anthropic adapters
- **Strategy patterns** — `BotStrategy`, `SendWebhookMessageStrategy`, `SendAPIMessageStrategy`
- **Utilities** — `LiveData` (reactive observable), error helpers, shared types

## Dependencies & Architecture

- Built first in every build: `npm run build:shared` compiles to `src/shared/dist/`
- Other containers reference `@starbunk/shared` via npm workspaces (resolves to local `dist/`)
- When published, goes to GitHub Packages (`npm.pkg.github.com/@starbunk/shared`)
- TypeScript project references enforce build order: shared → containers

## Edge Cases to Consider

- All exports must remain backward-compatible unless you bump `major`
- Avoid adding container-specific logic here — shared is infra only
- Breaking changes to shared require auditing all four containers
