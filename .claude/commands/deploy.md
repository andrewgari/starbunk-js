---
description: Deploy or update Docker containers on the Tower server via SSH
argument-hint: [service-name|all]
allowed-tools: [Bash]
---

# Deploy: Update Docker Containers on Tower

SSH into the Tower home server and update Docker containers by pulling the latest images and restarting services via Docker Compose.

## Arguments

The user invoked this with: $ARGUMENTS

- No argument or `all`: update every Docker Compose stack found under `/mnt/user/appdata/portainer`
- A specific service name (e.g. `starbunk`, `covabot`): update only the matching stack directory

## Step 1 — Discover compose files

SSH into the server and list all `docker-compose.yml` (or `compose.yml`) files:

```bash
tower "find /mnt/user/appdata/portainer -maxdepth 3 \( -name 'docker-compose.yml' -o -name 'compose.yml' \) | sort"
```

## Step 2 — Filter by argument (if provided)

If `$ARGUMENTS` is non-empty and not `all`, filter the discovered list to paths whose directory name contains the argument (case-insensitive).

## Step 3 — Update each stack

For each compose file path, run:

```bash
tower "cd <directory> && docker compose pull && docker compose up -d --remove-orphans"
```

Run these sequentially so output is readable. Capture and report each stack's result.

## Step 4 — Report

After all stacks are processed, print a summary table:

| Stack | Status |
|-------|--------|
| stack-name | Updated / No changes / Failed |

If any stack failed, show the error output and suggest next steps.

## Notes

- `tower` is a preconfigured SSH alias — no credentials needed.
- The Portainer appdata path on the server is `/mnt/user/appdata/portainer`.
- Each subdirectory under that path typically maps to one stack.
- Use `docker compose` (v2) not `docker-compose` (v1).
- If a pull fails due to rate limiting, report it and continue with the remaining stacks.
