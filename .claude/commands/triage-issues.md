---
description: Triage accumulated automated GitHub issues (health-report, log-analysis) — close stale/superseded, surface actionable items
allowed-tools: [Bash, Read]
---

# /triage-issues

Reduce the automated issue backlog. Close duplicates and stale reports. Surface what actually needs action.

## Step 1 — Fetch open automated issues

```bash
gh issue list --label "health-report" --state open --json number,title,createdAt,url --limit 50
gh issue list --label "log-analysis"  --state open --json number,title,createdAt,url --limit 50
```

## Step 2 — Triage health-report issues

Health reports are weekly snapshots. Only the most recent is relevant.

- Sort by `createdAt` descending.
- **Read the newest report's body** in full:
  ```bash
  gh issue view <newest-number> --json body,createdAt,title
  ```
- **Close all older reports** as superseded:
  ```bash
  gh issue close <number> --comment "Superseded by #<newest-number>. Closing to reduce backlog."
  ```
- **Assess the newest report**:
  - If all checks are clean (no lint errors, no failing tests, no high-severity audit findings) → close it too with "All checks clean."
  - If there are actionable findings (failing tests, security vulns, type errors), leave it open and add a comment summarising the top 2–3 action items.

## Step 3 — Triage log-analysis issues

Log analysis issues represent real production events — be conservative. Read each one before acting.

```bash
gh issue view <number> --json number,title,body,createdAt,comments
```

Classify each issue as one of:

| Class | Criteria | Action |
|---|---|---|
| **SUPERSEDED** | A newer issue covers the same container + error pattern | Close: `gh issue close <n> --comment "Covered by #<newer>."` |
| **STALE** | Older than 14 days, no comments, pattern not seen in recent issues | Close: `gh issue close <n> --comment "No recurrence in 14 days — closing as likely resolved. Reopen if it returns."` |
| **RECURRING** | Same error pattern in 2+ open issues | Close older ones, add comment on newest: "Recurring pattern — seen in #<list>." |
| **ACTIONABLE** | Recent, specific, not covered elsewhere | Leave open, add triage comment (see below) |

For ACTIONABLE issues, add a comment with:
- Which container is affected
- What the error is (one sentence)
- A concrete suggested next step (e.g. "Check covabot logs since last deploy", "Add rate-limit alert for this error class")

## Step 4 — Report

After triaging, output a summary:

```
## Triage Summary

### Closed
- #<n> — <reason>

### Remaining open
- #<n> — <what action is needed>

### Patterns
- <any recurring themes worth noting>
```

## Rules

- Never close without a `--comment` explaining why.
- When in doubt, leave open. False negatives (missing a real issue) are worse than noise.
- Do not create branches or fix anything — this command triages only.
- Do not bulk-close without reading each issue body.
