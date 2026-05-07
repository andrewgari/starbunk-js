# Global Workspace Instructions (Starbunk-JS)

## Overview
This repository contains StarBunk, a sophisticated Discord bot built with TypeScript using a 4-container modular architecture. The system relies on Postgres, Redis, and Qdrant databases for state management and semantic search.

## Major Pillars
The project is split into four isolated containers, each under `src/`:
1. **BunkBot** (`src/bunkbot`): Handles reply bots and admin commands.
2. **DJCova** (`src/djcova`): Voice channel music playback and audio stream.
3. **CovaBot** (`src/covabot`): AI-powered personality emulation.
4. **BlueBot** (`src/bluebot`): Pattern matching bot for "blue" references.

---

## Second Brain / Wiki — MANDATORY

> **Non-negotiable: the wiki is the project's long-term memory. You must read it before starting and update it after finishing every meaningful task.**

### Location
- `wiki/` — permanent, committed markdown files (Obsidian-compatible)
- `wiki/raw/` — staging area for in-progress or pre-merge content
- `wiki/templates/` — page templates

### Rules — follow these every time

1. **Before starting any task** — search the wiki for relevant pages. If a page exists, read it fully before writing a single line of code.
2. **After completing any meaningful task** — update the relevant wiki page(s) to reflect what changed. If no page exists yet, create one.
3. **A task is not done until the wiki is updated.** This is part of the definition of done, the same as passing CI.
4. Create new pages freely. Use [[Obsidian-style links]] to connect related pages.
5. Keep `wiki/raw/` for drafts and staged content. Promote to `wiki/` on merge.

### What counts as "meaningful"
Any change that affects: architecture, configuration, a bot's behavior, infrastructure, deployment, testing strategy, a new feature, or a bug fix with a non-obvious root cause.

---

## CHANGELOG Workflow

Every branch that introduces meaningful changes maintains its own changelog entry in `wiki/raw/`.

### While working on a branch

Create or update `wiki/raw/CHANGELOG-<branch-name>.md` as you go. Format:

```markdown
## [Unreleased] — <branch-name>

### Added
- ...

### Changed
- ...

### Fixed
- ...
```

This file is committed to the branch alongside code changes. It is the staging area for the real changelog.

### On merge (PR completion)

Prepend the branch entry into `wiki/Changelog.md` under the current date, then delete the `raw/CHANGELOG-<branch-name>.md` file. The permanent changelog lives at `wiki/Changelog.md`.

Format for a merged entry in `wiki/Changelog.md`:

```markdown
## YYYY-MM-DD — <short description> (#PR)

### Added / Changed / Fixed
- ...
```

---

## Skills — Use the Right Tool

Skills are slash commands that enforce consistent workflows. **Always prefer a skill over doing the equivalent steps manually.** The two most critical ones for this project are called out below; do not bypass them.

### `/task` — default for all code changes (MANDATORY)

Use `/task` any time you are asked to implement, fix, refactor, or otherwise change code. It is the default skill for every development request.

What it enforces:
- Syncs `main` before branching — you never work off a stale base
- Creates a properly named `<type>/<description>` branch — you never commit directly to `main`
- Stages only specific files — never `git add .` or `git add -A`
- Writes conventional commits (`feat(scope): ...`, `fix(scope): ...`)
- Never uses `--no-verify`
- Opens a PR with a summary and test plan when done

**Bypass only when the user explicitly says** "work on the current branch" or "skip the PR".

### `/deploy` — all production deployments (MANDATORY)

Use `/deploy` any time you are asked to deploy, update containers, restart services, or push changes to the Tower server. Never SSH into Tower and run docker commands manually.

What it enforces:
- Discovers the correct Compose stacks under `/mnt/user/appdata/portainer`
- Rsyncs `infrastructure/` (Grafana dashboards, provisioning files) before restarting
- Uses `docker compose` (v2), not `docker-compose` (v1)
- Reports per-stack success/failure

```
/deploy           # update all stacks
/deploy starbunk  # update only the starbunk stack
```

### Other useful skills

| Skill | When to use |
|-------|-------------|
| `/check` | Before declaring a task done — runs the full CI suite locally |
| `/build` | When you need to verify a clean build without running all tests |
| `/test` | Run the test suite in isolation |
| `/lint` | Fix lint errors before committing |
| `/review-pr-comments` | After a PR is open — reads open review comments, implements fixes, resolves them |
| `/simplify` | After a feature is working — review for unnecessary complexity |
| `/logs` | Inspect container or application logs on Tower |

---

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

A task is **complete** only when all of the following are true:

- [ ] All CI/CD checks are green
- [ ] `npm run check:ci` passes locally (type-check, lint, tests)
- [ ] Any blocking PR review comments are resolved
- [ ] Relevant wiki page(s) are updated
- [ ] `wiki/raw/CHANGELOG-<branch>.md` exists (or has been merged into `wiki/Changelog.md` on close)

If CI fails, fixing it is part of the task — not optional.

## Scripts Context
- `npm run dev:[container_name]` starts custom containers individually.
- `docker-compose up -d` handles complete integration spins.
