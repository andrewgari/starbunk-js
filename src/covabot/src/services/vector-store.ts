/**
 * Vector Store Service
 *
 * In-memory vector storage with SQLite persistence.
 * Provides fast cosine similarity search for embeddings.
 *
 * Design: Keeps vectors in memory for fast search, persists to SQLite for durability.
 * For larger scale, replace with Qdrant, Pinecone, or sqlite-vss.
 */

import Database from 'better-sqlite3';
import { logLayer } from '@starbunk/shared/observability/log-layer';
import { cosineSimilarity } from './llm/embedding-provider';

const logger = logLayer.withPrefix('VectorStore');

export interface VectorEntry {
  id: string;
  profileId: string;
  collection: string;
  text: string;
  vector: number[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface SimilarityResult {
  id: string;
  text: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export class VectorStore {
  private db: Database.Database;
  private vectors: Map<string, VectorEntry> = new Map();
  private initialized = false;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Initialize the vector store (create tables and load into memory)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.info('Initializing vector store');

    // Create table if not exists
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vector_embeddings (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        collection TEXT NOT NULL,
        text TEXT NOT NULL,
        vector BLOB NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_vector_profile_collection
        ON vector_embeddings(profile_id, collection);
    `);

    // Load existing vectors into memory
    await this.loadVectorsFromDb();

    this.initialized = true;
    logger.withMetadata({ vectorCount: this.vectors.size }).info('Vector store initialized');
  }

  /**
   * Add a vector to the store
   */
  async upsert(entry: Omit<VectorEntry, 'createdAt'>): Promise<void> {
    const fullEntry: VectorEntry = {
      ...entry,
      createdAt: new Date(),
    };

    // Persist to SQLite
    const stmt = this.db.prepare(`
      INSERT INTO vector_embeddings (id, profile_id, collection, text, vector, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        text = excluded.text,
        vector = excluded.vector,
        metadata = excluded.metadata,
        created_at = CURRENT_TIMESTAMP
    `);

    const vectorBlob = Buffer.from(new Float32Array(entry.vector).buffer);
    const metadataJson = entry.metadata ? JSON.stringify(entry.metadata) : null;

    stmt.run(entry.id, entry.profileId, entry.collection, entry.text, vectorBlob, metadataJson);

    // Update in-memory store
    this.vectors.set(entry.id, fullEntry);

    logger.withMetadata({
      id: entry.id,
      collection: entry.collection,
      dimensions: entry.vector.length,
    }).debug('Vector upserted');
  }

  /**
   * Find similar vectors using cosine similarity
   */
  search(
    profileId: string,
    collection: string,
    queryVector: number[],
    limit: number = 5,
    minScore: number = 0.0,
  ): SimilarityResult[] {
    const candidates: SimilarityResult[] = [];

    for (const entry of this.vectors.values()) {
      if (entry.profileId !== profileId || entry.collection !== collection) {
        continue;
      }

      const score = cosineSimilarity(queryVector, entry.vector);

      if (score >= minScore) {
        candidates.push({
          id: entry.id,
          text: entry.text,
          score,
          metadata: entry.metadata,
        });
      }
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    return candidates.slice(0, limit);
  }

  /**
   * Delete a vector by ID
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM vector_embeddings WHERE id = ?');
    const result = stmt.run(id);
    this.vectors.delete(id);
    return result.changes > 0;
  }

  /**
   * Delete all vectors for a profile/collection
   */
  deleteCollection(profileId: string, collection: string): number {
    const stmt = this.db.prepare(
      'DELETE FROM vector_embeddings WHERE profile_id = ? AND collection = ?',
    );
    const result = stmt.run(profileId, collection);

    // Remove from memory
    for (const [id, entry] of this.vectors.entries()) {
      if (entry.profileId === profileId && entry.collection === collection) {
        this.vectors.delete(id);
      }
    }

    return result.changes;
  }

  /**
   * Get vector count for a collection
   */
  getCollectionSize(profileId: string, collection: string): number {
    let count = 0;
    for (const entry of this.vectors.values()) {
      if (entry.profileId === profileId && entry.collection === collection) {
        count++;
      }
    }
    return count;
  }

  /**
   * Load vectors from SQLite into memory
   */
  private async loadVectorsFromDb(): Promise<void> {
    const rows = this.db.prepare('SELECT * FROM vector_embeddings').all() as {
      id: string;
      profile_id: string;
      collection: string;
      text: string;
      vector: Buffer;
      metadata: string | null;
      created_at: string;
    }[];

    for (const row of rows) {
      const vector = Array.from(new Float32Array(row.vector.buffer.slice(
        row.vector.byteOffset,
        row.vector.byteOffset + row.vector.byteLength,
      )));

      this.vectors.set(row.id, {
        id: row.id,
        profileId: row.profile_id,
        collection: row.collection,
        text: row.text,
        vector,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        createdAt: new Date(row.created_at),
      });
    }
  }
}

