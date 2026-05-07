---
description: Start a new task on a fresh branch and open a PR when done
argument-hint: [type/description]
allowed-tools: [Bash, Read, Write, Edit, MultiEdit, Glob, Grep]
---

# Task: Branch → Worktree → Work → PR

Full development workflow: sync main, branch, create an isolated worktree, do the work, open a PR, clean up.

Using a worktree gives each task its own working directory so multiple agents can run in parallel without conflicting.

## Arguments

The user invoked this with: $ARGUMENTS

Parse the arguments to determine:
- **type**: one of `feat`, `fix`, `chore`, `refactor`, `docs`, `test` — infer from context if not given
- **description**: short kebab-case summary of the work (max 50 chars, lowercase, hyphens only)

If no arguments were provided, ask the user: "What are we working on? (e.g. `feat/add-user-auth` or just describe the task)"

## Step 1 — Sync main

From the **main repo root** (`/mnt/data/tank/workspace/starbunk-js`):

```bash
git checkout main
git pull origin main
```

If `git checkout main` fails (dirty working tree), stop and tell the user: "Working tree has uncommitted changes. Please stash or commit them first."

## Step 2 — Create branch

Derive the branch name as `<type>/<description>` (e.g. `feat/add-deploy-skill`, `fix/covabot-crash`).

```bash
git checkout -b <branch-name>
```

## Step 3 — Create worktree

Create an isolated working directory for this task. All file work happens here from this point on.

```bash
git worktree add .claude/worktrees/<branch-name> <branch-name>
```

The worktree path is: `.claude/worktrees/<branch-name>` (gitignored, safe to create freely).

**Bootstrap the worktree** — symlink node_modules to avoid a full reinstall on tasks that don't change dependencies:

```bash
ln -s /mnt/data/tank/workspace/starbunk-js/node_modules \
  /mnt/data/tank/workspace/starbunk-js/.claude/worktrees/<branch-name>/node_modules
```

If the task adds or changes npm dependencies, remove the symlink and run `npm ci` in the worktree instead.

Tell the user: "Worktree ready at `.claude/worktrees/<branch-name>`. Working in isolation."

## Step 4 — Do the work

**All file reads, edits, and writes must use the worktree path as root:**
`/mnt/data/tank/workspace/starbunk-js/.claude/worktrees/<branch-name>/`

Follow project conventions from CLAUDE.md:
- Changes to shared code go in `src/shared/`
- Each container (bunkbot, covabot, djcova, bluebot) is isolated under `src/`
- Do not commit anything under `config/`, `.workspace/`, `data/`, or `local/`

Run checks from the worktree root:
```bash
cd /mnt/data/tank/workspace/starbunk-js/.claude/worktrees/<branch-name> && npm run check:ci
```

## Step 5 — Commit

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
cd /mnt/data/tank/workspace/starbunk-js/.claude/worktrees/<branch-name>
git add <specific files>
git commit -m "..."
```

## Step 6 — Push and open PR

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

## Step 7 — Clean up worktree

After the PR is open, remove the worktree to keep the repo tidy:

```bash
cd /mnt/data/tank/workspace/starbunk-js
git worktree remove .claude/worktrees/<branch-name>
```

Return the PR URL to the user.

## Rules

- Never skip Step 1 — always start from an up-to-date main.
- Never commit to main directly.
- Never use `git add .` or `git add -A` — always stage specific files.
- Never use `--no-verify` on commits.
- All file operations after Step 3 must use the worktree path, not the main repo.
- If tests exist for the affected code, run them before committing.
- If the task spans multiple logical changes, use multiple commits on the same branch.
