# Global Workspace Instructions (Starbunk-JS)

## Overview
This repository contains StarBunk, a sophisticated Discord bot built with TypeScript using a 4-container modular architecture. The system relies on Postgres, Redis, and Qdrant databases for state management and semantic search.

## Major Pillars
The project is split into four isolated containers, each under `src/`:
1. **BunkBot** (`src/bunkbot`): Handles reply bots and admin commands.
2. **DJCova** (`src/djcova`): Voice channel music playback and audio stream.
3. **CovaBot** (`src/covabot`): AI-powered personality emulation.
4. **BlueBot** (`src/bluebot`): Pattern matching bot for "blue" references.

## Second Brain / Wiki
- Location: `wiki/` (repo root)
- **Always** check relevant wiki pages before starting any task
- **Always** update the relevant page after completing a task
- Wiki uses markdown files organized by topic
- If a page doesn't exist for something, create it
- keep folder structure /raw /wiki and /templates. /wiki will be permanent commited files, use raw clean so we can see staged changes before moving them.
- Liberal use of Obsidian linking

## Development Constraints
- **Do not commit local secrets or configurations** under `config/`, `.workspace/`, `data/`, or `local/`.
- Ensure changes follow the defined container separation. Each container maintains its specific dependencies.
- Changes to shared packages/libraries must be made in `src/shared`.
- Use correct Docker service names (`starbunk-postgres`, `starbunk-redis`, `starbunk-qdrant`) for inter-container communication.

## Versioning & Releases

Each app (`bunkbot`, `djcova`, `covabot`, `bluebot`) and `shared` has its own independent version managed by **changesets**.

**Rule: any PR that changes source code in `src/{app}/src/` MUST include a changeset.**

```bash
npm run cs          # add a changeset (interactive — pick package, level, write one line)
npm run cs:status   # see what's queued
npm run show-versions  # print current version of every package
```

Bump levels: `patch` (bug fix), `minor` (new feature), `major` (breaking change).

The changeset file goes in `.changeset/` and must be committed with your changes. Infra-only PRs (no source changes in `src/{app}/src/`) may omit a changeset.

`@starbunk/shared` changes do **not** auto-bump app versions. Apps only bump when they have their own changeset. If an app needs a new shared feature, update its `@starbunk/shared` dep and add a changeset for that app in the same PR.

## CI/CD and Definition of "Done"
- The only satisfactory **"complete"** state for any task touching this repository is when **all CI/CD checks are passing**.
- Locally, always run `npm run check:ci` at the project root before considering a task done.
  - `npm run check:ci` currently runs type-checking, linting, and the full test suite.
- For any work that results in a PR, do **not** treat the task as complete until:
  - All GitHub/CI checks are green for that PR, and
  - Any blocking code review comments have been addressed.
- If CI fails, fixing the failure (or updating the tests/CI configuration with explicit agreement) is part of the task, not a separate optional step.

## Scripts Context
- `npm run dev:[container_name]` starts custom containers individually.
- `docker-compose up -d` handles complete integration spins.
