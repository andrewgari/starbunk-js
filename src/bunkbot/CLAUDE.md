# BunkBot - Development Instructions

## Goals & Purpose
BunkBot serves as the administrative backbone and general reply bot for the StarBunk system. It is optimized for high message volume and fast reaction times.

## Major Features
- Discord Bot management.
- General administrative commands.
- Webhook-based responses.

## Inputs & Outputs
- **Input:** Discord events, including chat messages and admin slash commands.
- **Output:** Webhook messages or direct Discord replies. Execute administrative actions.

## Dependencies & Architecture
- **Primary Dependencies:** Discord.js, Webhooks, Postgres database.
- Scaled for high message volume; maintain lightweight handlers without heavy computational synchronous workloads.

## Edge Cases to Consider
- Handling webhook timeouts or permission issues.
- Handling race conditions for admin commands executed simultaneously.
- Graceful degradation when the Postgres connection drops.
