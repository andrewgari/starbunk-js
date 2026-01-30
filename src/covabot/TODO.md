# CovaBot Conversation Memory (PostgreSQL) - PRD

## Context
Issue: https://github.com/andrewgari/starbunk-js/issues/516

CovaBot currently uses SQLite for conversation memory. We will migrate to PostgreSQL-only storage for Phase 2 and implement per-user conversation memory with TTL cleanup and context window management.

## File Scope
- src/covabot/src/repositories/*
- src/covabot/src/services/memory-service.ts
- src/covabot/tests/integration/message-flow.test.ts
- src/covabot/migrations/*.sql

## The Change
Migrate CovaBot from SQLite to PostgreSQL for conversation memory with proper repository pattern implementation, observability spans, and comprehensive test coverage.

## Relationship
- Depends on: PostgreSQL service from shared package
- Related to: Issue #516 - CovaBot PostgreSQL migration
- No conflicts with other agents

## Goals
- PostgreSQL schema for conversation memory with JSONB metadata.
- Reliable storage and retrieval of per-user conversation context.
- TTL cleanup for records older than 30 days.
- Observability spans for record/load/context build.
- Unit + integration tests with coverage >= 80%.

## Non-Goals
- Token counting or embeddings (explicitly deferred).
- Dual SQLite + PostgreSQL support.

## Functional Requirements
1. **Schema**
   - Table: `covabot_conversations`
     - `id` UUID PK (default `gen_random_uuid()`)
     - `user_id` (Discord ID, indexed)
     - `channel_id` (Discord ID, indexed)
     - `profile_id` (personality profile)
     - `message_content` (text)
     - `response_content` (text)
     - `metadata` (JSONB)
     - `created_at`, `updated_at`
   - Indexes:
     - `(user_id, created_at)`
     - `(channel_id, created_at)`
     - `profile_id`
     - `metadata` GIN

2. **Migrations**
   - `migrations/covabot_001_init_conversations.sql` (idempotent)
   - Enable `pgcrypto` for UUIDs (if needed).

3. **Conversation Memory Service**
   - `recordConversation(userId, channelId, userMessage, covaResponse, metadata)`
   - `getConversationContext(userId, limit=50)`
   - `getContextWindow(userId, tokenLimit=2048)` (token logic stubbed/no-op for now)
   - `deleteOldConversations(days=30)`

4. **TTL Cleanup**
   - Scheduled delete job: `DELETE FROM covabot_conversations WHERE created_at < NOW() - INTERVAL '30 days'`.

5. **Observability**
   - Spans: `conversation.record`, `conversation.load`, `context.build`.
   - Attributes: `user_id`, `channel_id`, `context_size`.

6. **Testing**
   - Unit tests for repository + service logic.
   - Integration tests with testcontainers Postgres.

## Acceptance Criteria
- Schema migrates cleanly.
- ConversationMemory records + retrieves correctly.

## Repo Validations
- [x] All tests passing (message-flow.test.ts)
- [x] Lint checks passing
- [x] Type checks passing
- [x] Integration tests with mock PostgreSQL

## Security
- [x] No Snyk vulnerabilities introduced
- [x] SQL injection prevented via parameterized queries
- [x] No sensitive data in logs
- TTL cleanup works for 30-day retention.
- Tracing spans present with expected attributes.
- Snyk clean after changes.
- Performance: context retrieval < 50ms in tests.
- Abstraction over database layer so it's easier to switch to another database in the future.

## Milestones
1. Schema & migration runner
2. Repository + service updates
3. TTL cleanup job
4. Tests + observability
5. Refactoring and Cleanup.
6. Validation + Snyk
