/**
 * PostgreSQL Vector Store Service (pgvector)
 *
 * Replaces the SQLite-backed VectorStore with native pgvector support.
 * All similarity search happens in the database using pgvector's cosine distance operator.
 *
 * Design: No in-memory cache. pgvector indexes handle fast similarity search natively.
 */

import { logLayer } from '../../observability/log-layer';
import { PostgresService } from '../database/postgres-service';

const logger = logLayer.withPrefix('PostgresVectorStore');

const TARGET_DIMENSIONS = 1536;

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

export class PostgresVectorStore {
  private pgService: PostgresService;
  private initialized = false;

  constructor(pgService: PostgresService) {
    this.pgService = pgService;
  }

  /**
   * Initialize the vector store (run migrations if needed)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.info('Initializing PostgreSQL vector store');

    // Migration is handled by PostgresService.runMigrations() with the shared migrations dir.
    // Just verify the table exists.
    try {
      const result = await this.pgService.query<{ exists: boolean }>(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'vector_embeddings'
        ) as exists`,
      );

      if (!result[0]?.exists) {
        logger.warn(
          'vector_embeddings table not found. Ensure shared migrations have been run.',
        );
      }
    } catch (error) {
      logger.withError(error).error('Failed to verify vector store table');
      throw error;
    }

    this.initialized = true;
    logger.info('PostgreSQL vector store initialized');
  }

  /**
   * Add or update a vector in the store
   */
  async upsert(entry: Omit<VectorEntry, 'createdAt'>): Promise<void> {
    const paddedVector = this.padVector(entry.vector);
    const vectorStr = `[${paddedVector.join(',')}]`;
    const metadataJson = entry.metadata ? JSON.stringify(entry.metadata) : '{}';

    await this.pgService.query(
      `INSERT INTO vector_embeddings (id, profile_id, collection, text, embedding, embedding_dimensions, metadata)
       VALUES ($1, $2, $3, $4, $5::vector, $6, $7::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         text = EXCLUDED.text,
         embedding = EXCLUDED.embedding,
         embedding_dimensions = EXCLUDED.embedding_dimensions,
         metadata = EXCLUDED.metadata,
         created_at = CURRENT_TIMESTAMP`,
      [
        entry.id,
        entry.profileId,
        entry.collection,
        entry.text,
        vectorStr,
        entry.vector.length,
        metadataJson,
      ],
    );

    logger
      .withMetadata({
        id: entry.id,
        collection: entry.collection,
        dimensions: entry.vector.length,
      })
      .debug('Vector upserted');
  }

  /**
   * Find similar vectors using pgvector cosine distance
   *
   * pgvector's `<=>` operator returns cosine distance (0 = identical, 2 = opposite).
   * We convert to similarity: score = 1 - distance.
   */
  async search(
    profileId: string,
    collection: string,
    queryVector: number[],
    limit: number = 5,
    minScore: number = 0.0,
  ): Promise<SimilarityResult[]> {
    const paddedVector = this.padVector(queryVector);
    const vectorStr = `[${paddedVector.join(',')}]`;

    // cosine distance: 0 = identical, so similarity = 1 - distance
    // Filter: 1 - distance >= minScore  →  distance <= 1 - minScore
    const maxDistance = 1 - minScore;

    const rows = await this.pgService.query<{
      id: string;
      text: string;
      distance: number;
      metadata: Record<string, unknown> | null;
    }>(
      `SELECT id, text, embedding <=> $1::vector AS distance, metadata
       FROM vector_embeddings
       WHERE profile_id = $2
         AND collection = $3
         AND (embedding <=> $1::vector) <= $4
       ORDER BY embedding <=> $1::vector ASC
       LIMIT $5`,
      [vectorStr, profileId, collection, maxDistance, limit],
    );

    return rows.map((row) => ({
      id: row.id,
      text: row.text,
      score: 1 - Number(row.distance),
      metadata: row.metadata ?? undefined,
    }));
  }

  /**
   * Delete a vector by ID
   */
  async delete(id: string): Promise<boolean> {
    const client = await this.pgService.getClient();
    try {
      const result = await client.query(
        'DELETE FROM vector_embeddings WHERE id = $1',
        [id],
      );
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Delete all vectors for a profile/collection
   */
  async deleteCollection(profileId: string, collection: string): Promise<number> {
    const client = await this.pgService.getClient();
    try {
      const result = await client.query(
        'DELETE FROM vector_embeddings WHERE profile_id = $1 AND collection = $2',
        [profileId, collection],
      );
      return result.rowCount ?? 0;
    } finally {
      client.release();
    }
  }

  /**
   * Get vector count for a collection
   */
  async getCollectionSize(profileId: string, collection: string): Promise<number> {
    const rows = await this.pgService.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM vector_embeddings WHERE profile_id = $1 AND collection = $2',
      [profileId, collection],
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  }

  /**
   * Pad a vector to TARGET_DIMENSIONS with zeros if shorter.
   * This allows storing vectors from different embedding models (768, 1536, etc.)
   * in the same vector(1536) column.
   */
  private padVector(vector: number[]): number[] {
    if (vector.length === TARGET_DIMENSIONS) return vector;
    if (vector.length > TARGET_DIMENSIONS) {
      logger.warn(
        `Vector has ${vector.length} dimensions, truncating to ${TARGET_DIMENSIONS}`,
      );
      return vector.slice(0, TARGET_DIMENSIONS);
    }
    // Pad with zeros
    const padded = new Array(TARGET_DIMENSIONS).fill(0);
    for (let i = 0; i < vector.length; i++) {
      padded[i] = vector[i];
    }
    return padded;
  }
}
