---
description: Start a new task on a fresh branch and open a PR when done
argument-hint: [type/description]
allowed-tools: [Bash, Read, Write, Edit, MultiEdit, Glob, Grep]
---

# Task: Branch → Work → PR

Full development workflow: sync main, branch, do the work, open a PR.

## Arguments

The user invoked this with: $ARGUMENTS

Parse the arguments to determine:
- **type**: one of `feat`, `fix`, `chore`, `refactor`, `docs`, `test` — infer from context if not given
- **description**: short kebab-case summary of the work (max 50 chars, lowercase, hyphens only)

If no arguments were provided, ask the user: "What are we working on? (e.g. `feat/add-user-auth` or just describe the task)"

## Step 1 — Sync main

```bash
git checkout main
git pull origin main
```

If `git checkout main` fails (dirty working tree), stop and tell the user: "Working tree has uncommitted changes. Please stash or commit them first."

## Step 2 — Create branch

Derive the branch name as `<type>/<description>` from the arguments (e.g. `feat/add-deploy-skill`, `fix/covabot-crash`).

```bash
git checkout -b <branch-name>
```

Confirm the branch was created, then tell the user: "On branch `<branch-name>`. Ready to work."

## Step 3 — Do the work

Perform the task the user described. Use all available tools as needed.

Follow the project conventions in CLAUDE.md:
- Changes to shared code go in `src/shared/`
- Each container (bunkbot, covabot, djcova, bluebot) is isolated under `src/`
- Do not commit anything under `config/`, `.workspace/`, `data/`, or `local/`

## Step 4 — Commit

Stage only the files changed for this task. Write a conventional commit message:

```
<type>(<scope>): <short description>

<optional body if non-obvious>
```

Examples:
- `feat(covabot): add personality memory persistence`
- `fix(djcova): handle empty queue on skip command`
- `chore(ci): update docker publish tags`

```bash
git add <specific files>
git commit -m "..."
```

## Step 5 — Push and open PR

```bash
git push -u origin <branch-name>
```

Then create the PR:

```bash
gh pr create \
  --title "<type>(<scope>): <short description>" \
  --body "$(cat <<'EOF'
## Summary
- <bullet points describing what changed and why>

## Test plan
- [ ] <manual or automated test steps>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Return the PR URL to the user when done.

## Rules

- Never skip Step 1 — always start from an up-to-date main.
- Never commit to main directly.
- Never use `git add .` or `git add -A` — always stage specific files.
- Never use `--no-verify` on commits.
- If tests exist for the affected code, run them before committing.
- If the task spans multiple logical changes, use multiple commits on the same branch.
