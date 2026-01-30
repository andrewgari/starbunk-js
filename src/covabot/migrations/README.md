# CovaBot Database Migrations

This directory contains PostgreSQL schema migrations specific to CovaBot's conversation memory system.

## Migration Naming Convention

Migrations are named: `<service>_<number>_<description>.sql`

Example: `covabot_001_init_conversations.sql`

## Applying Migrations

Migrations are automatically applied when CovaBot initializes via `initializeDatabase()` in `src/database/index.ts`.

The PostgreSQL service:
1. Creates a `schema_migrations` tracking table
2. Scans this directory for `.sql` files
3. Applies migrations in alphabetical order
4. Skips already-applied migrations (idempotent)

## Adding New Migrations

1. Create a new `.sql` file following the naming convention
2. Use `IF NOT EXISTS` clauses for idempotency
3. Test locally before committing
4. Migration files are loaded at runtime, so they must be included in Docker builds

## Current Migrations

- **covabot_001_init_conversations.sql** - Initial schema with conversation history, user facts, personality evolution, social battery, and keyword interests tables
