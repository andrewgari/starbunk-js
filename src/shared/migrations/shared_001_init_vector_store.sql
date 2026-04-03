-- Vector Store Schema - Migration 001
-- Issues: #618, #619
-- Purpose: Initialize pgvector-based vector storage (replaces SQLite VectorStore)

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Vector embeddings table
-- Uses TEXT primary key to match existing VectorStore ID format (e.g., "profileId:interest:0")
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

-- Index for filtering by profile + collection (used before vector search)
CREATE INDEX IF NOT EXISTS idx_ve_profile_collection
  ON vector_embeddings(profile_id, collection);

-- IVFFlat cosine similarity index
-- lists=10 is safe for small initial datasets; increase to 100+ as data grows
CREATE INDEX IF NOT EXISTS idx_ve_embedding_cosine
  ON vector_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);
