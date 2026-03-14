/**
 * Vector Store Service
 *
 * In-memory vector storage with PostgreSQL persistence.
 * Provides fast cosine similarity search for embeddings.
 *
 * Design: Keeps vectors in memory for fast search, persists to PostgreSQL for durability.
 * For larger scale, replace with Qdrant, Pinecone, or specialized vector DB.
 */

import { logLayer } from '../../observability/log-layer';
import { PostgresService } from '../database/postgres-service';
import { cosineSimilarity } from '../llm/embedding-provider';

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
  private pgService: PostgresService;
  private vectors: Map<string, VectorEntry> = new Map();
  private initialized = false;

  constructor(pgService: PostgresService) {
    this.pgService = pgService;
  }

  /**
   * Initialize the vector store (create tables and load into memory)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.info('Initializing vector store');

    // Create table if not exists
    await this.pgService.query(`
      CREATE TABLE IF NOT EXISTS vector_embeddings (
        id VARCHAR(255) PRIMARY KEY,
        profile_id VARCHAR(100) NOT NULL,
        collection VARCHAR(100) NOT NULL,
        text TEXT NOT NULL,
        vector BYTEA NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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

    // Persist to PostgreSQL
    const vectorBlob = Buffer.from(new Float32Array(entry.vector).buffer);
    const metadataJson = entry.metadata ? JSON.stringify(entry.metadata) : null;

    await this.pgService.query(
      `
      INSERT INTO vector_embeddings (id, profile_id, collection, text, vector, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT(id) DO UPDATE SET
        text = EXCLUDED.text,
        vector = EXCLUDED.vector,
        metadata = EXCLUDED.metadata,
        created_at = CURRENT_TIMESTAMP
    `,
      [entry.id, entry.profileId, entry.collection, entry.text, vectorBlob, metadataJson],
    );

    // Update in-memory store
    this.vectors.set(entry.id, fullEntry);

    logger
      .withMetadata({
        id: entry.id,
        collection: entry.collection,
        dimensions: entry.vector.length,
      })
      .debug('Vector upserted');
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
  async delete(id: string): Promise<boolean> {
    await this.pgService.query(`DELETE FROM vector_embeddings WHERE id = $1`, [id]);
    this.vectors.delete(id);
    // Note: query usually returns rows, but if it's a DELETE we might need to check rowCount
    // For now, assume it succeeded if no error thrown
    return true;
  }

  /**
   * Delete all vectors for a profile/collection
   */
  async deleteCollection(profileId: string, collection: string): Promise<number> {
    await this.pgService.query(
      'DELETE FROM vector_embeddings WHERE profile_id = $1 AND collection = $2',
      [profileId, collection],
    );

    // Remove from memory
    for (const [id, entry] of this.vectors.entries()) {
      if (entry.profileId === profileId && entry.collection === collection) {
        this.vectors.delete(id);
      }
    }

    return 0; // pg query result doesn't directly return rowCount in our query helper easily without modification
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
   * Load vectors from PostgreSQL into memory
   */
  private async loadVectorsFromDb(): Promise<void> {
    const rows = await this.pgService.query<{
      id: string;
      profile_id: string;
      collection: string;
      text: string;
      vector: Buffer;
      metadata: any;
      created_at: Date;
    }>('SELECT * FROM vector_embeddings');

    for (const row of rows) {
      const vector = Array.from(
        new Float32Array(
          row.vector.buffer.slice(
            row.vector.byteOffset,
            row.vector.byteOffset + row.vector.byteLength,
          ),
        ),
      );

      this.vectors.set(row.id, {
        id: row.id,
        profileId: row.profile_id,
        collection: row.collection,
        text: row.text,
        vector,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
        createdAt: new Date(row.created_at),
      });
    }
  }
}
