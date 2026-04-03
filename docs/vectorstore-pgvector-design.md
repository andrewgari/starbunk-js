# Technical Design: VectorStore Migration to pgvector

**Issues:** #618, #619  
**Date:** 2026-04-03  

## Architecture Decisions

### 1. Dynamic Dimensions (No Fixed Column Size)
The codebase supports multiple embedding providers:
- OpenAI `text-embedding-3-small`: 1536 dimensions
- Ollama `nomic-embed-text`: 768 dimensions

**Decision:** Use `vector` type without fixed dimensions in the column definition, storing dimension info per-row. Actually, pgvector requires fixed dimensions per column. **Solution:** Use **1536** as the max dimension and pad shorter vectors with zeros, OR use separate tables per dimension. 

**Final decision:** Use `vector(1536)` as the standard column. If Ollama (768-dim) vectors are stored, pad them to 1536. This keeps the schema simple. The `embedding_dimensions` column tracks the original dimension for reconstruction.

*Alternative considered:* Storing as `real[]` and doing cosine similarity in SQL — loses pgvector indexing benefits.

### 2. Index Strategy
- **IVFFlat** for the initial implementation (simpler, good for < 1M vectors)
- `lists = 100` is appropriate for expected scale (thousands of vectors)
- Index on `(profile_id, collection)` for filtering before vector search
- **HNSW** can be adopted later if needed for better recall at scale

### 3. API Compatibility
The new `PostgresVectorStore` will implement the **exact same public interface** as the current `VectorStore`:
- `initialize(): Promise<void>`
- `upsert(entry): Promise<void>`
- `search(profileId, collection, queryVector, limit, minScore): SimilarityResult[]` → changes to `Promise<SimilarityResult[]>` (async)
- `delete(id): Promise<boolean>` (was sync)
- `deleteCollection(profileId, collection): Promise<number>` (was sync)
- `getCollectionSize(profileId, collection): Promise<number>` (was sync)

**Breaking change:** Methods become async. Consumers (`VectorInterestService`, `VectorMemoryService`) already use `await` on `upsert` but call `search`, `delete`, `deleteCollection`, `getCollectionSize` synchronously. These callers must be updated.

### 4. No In-Memory Cache
The current SQLite implementation loads ALL vectors into memory for search. With pgvector, search happens in the database using optimized indexes. **No in-memory cache needed.** This also removes the memory scaling concern.

### 5. Constructor Change
- Old: `constructor(db: Database.Database)` (better-sqlite3)
- New: `constructor(pgService: PostgresService)`

## Migration SQL

```sql
-- shared_001_init_vector_store.sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS vector_embeddings (
  id TEXT PRIMARY KEY,
  profile_id VARCHAR(255) NOT NULL,
  collection VARCHAR(100) NOT NULL,
  text TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  embedding_dimensions INTEGER NOT NULL DEFAULT 1536,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ve_profile_collection
  ON vector_embeddings(profile_id, collection);

-- IVFFlat index for cosine similarity search
-- Note: IVFFlat requires data to exist before creating the index for good list selection.
-- For initial deployment with no data, we create with lists=10 (safe for small datasets).
-- Re-create with lists=100+ once data volume grows.
CREATE INDEX IF NOT EXISTS idx_ve_embedding_cosine
  ON vector_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);
```

## Implementation Plan

1. Create `src/shared/migrations/shared_001_init_vector_store.sql`
2. Create `src/shared/src/services/vector/postgres-vector-store.ts`  
3. Update `VectorInterestService` and `VectorMemoryService` to use async methods
4. Update wiring/bootstrap code to construct `PostgresVectorStore` instead of `VectorStore`
5. Keep old `VectorStore` temporarily for Phase 2 cleanup

## File Changes

| File | Change |
|------|--------|
| `src/shared/migrations/shared_001_init_vector_store.sql` | New |
| `src/shared/src/services/vector/postgres-vector-store.ts` | New |
| `src/shared/src/services/vector/vector-interest-service.ts` | Update search/delete calls to async |
| `src/shared/src/services/vector/vector-memory-service.ts` | Update getCollectionSize to async |
| `src/shared/src/services/vector/index.ts` | Add barrel export for PostgresVectorStore |
| Consumer bootstrap/wiring | Swap VectorStore → PostgresVectorStore |
