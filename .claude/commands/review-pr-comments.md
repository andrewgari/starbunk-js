---
description: Review open PR comments, resolve no-ops, list actionable items for sign-off, implement fixes, then resolve those too
argument-hint: <pr-number>
allowed-tools: [Bash, Read, Write, Edit, MultiEdit, Glob, Grep]
---

# Review PR Comments

Systematically triage every open review thread on a GitHub PR: resolve noise,
surface real work, get sign-off, implement, then close.

## Arguments

PR number: $ARGUMENTS

If no PR number is provided, use the PR for the current branch:
```bash
gh pr view --json number -q .number
```

---

## Step 1 — Fetch all open review threads

Use the GitHub GraphQL API to get every review thread with its resolution
status, comments, file path, and line number:

```bash
gh api graphql -f query='
{
  repository(owner: "OWNER", name: "REPO") {
    pullRequest(number: PR_NUMBER) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          isOutdated
          path
          line
          comments(first: 10) {
            nodes {
              author { login }
              body
              createdAt
            }
          }
        }
      }
    }
  }
}'
```

Derive OWNER and REPO from:
```bash
gh repo view --json owner,name -q '"\(.owner.login)/\(.name)"'
```

---

## Step 2 — Triage each thread

For every **unresolved, non-outdated** thread, classify it:

| Class | Criteria | Action |
|---|---|---|
| **RESOLVE_NOW** | Outdated, already fixed in a later commit, pure praise, duplicate of another thread, or asks about something that was since refactored away | Resolve via GraphQL immediately |
| **NO_ACTION** | Nit/style that conflicts with existing project conventions, preference comment with no clear correct answer, or explicitly says "not a blocker" | Resolve via GraphQL immediately |
| **NEEDS_FIX** | Points to a real bug, misleading code, missing coverage, or correctness issue | Collect for sign-off list |

Resolve a thread:
```bash
gh api graphql -f query='
mutation {
  resolveReviewThread(input: { threadId: "THREAD_ID" }) {
    thread { id isResolved }
  }
}'
```

---

## Step 3 — Present sign-off list

Print a numbered list of every **NEEDS_FIX** thread:

```
Fixes requiring sign-off:

1. [file:line] Author: <one-line summary of what they want>
2. [file:line] Author: <one-line summary>
...

Reply with the numbers you approve (e.g. "all" or "1 3") to proceed.
```

**Stop here and wait for the user's response before doing any code changes.**

---

## Step 4 — Implement approved fixes

For each approved item:
- Read the affected file(s) before editing
- Make the minimal change that satisfies the comment
- Do not refactor surrounding code or add unrelated changes
- Run tests if they exist for the affected area:
  ```bash
  # From the container directory (src/djcova, src/bunkbot, etc.)
  npx vitest run
  ```

---

## Step 5 — Commit the fixes

Stage only the changed files. Use a conventional commit:

```
fix(<scope>): address PR review comments

- <one-line per fix>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Push to the current branch:
```bash
git push
```

---

## Step 6 — Resolve the fixed threads

For each thread that was fixed, resolve it via GraphQL (same mutation as Step 2).

Then confirm to the user:
```
Done. Resolved N threads without action, fixed and resolved M threads.
PR #<number> is up to date.
```

---

## Rules

- Never resolve a thread before the user approves the fix (NEEDS_FIX class).
- Never commit to main directly.
- Never use `git add .` or `git add -A`.
- Never use `--no-verify`.
- If a fix touches multiple files or is non-trivial, describe the approach
  briefly in the sign-off list so the user can make an informed decision.
- Outdated threads (isOutdated: true) are always safe to resolve immediately.
