// Qdrant Memory Service - Vector database integration for conversation memory
import { QdrantClient } from 'qdrant-js';
import { logger } from '@starbunk/shared';
import { 
  ConversationMemory, 
  MemoryError, 
  QdrantConfig, 
  VectorSearchQuery, 
  VectorSearchResult,
  MemoryMetadata 
} from '../../types';

/**
 * Service for managing conversation memories using Qdrant vector database
 */
export class QdrantMemoryService {
  private client: QdrantClient;
  private isInitialized = false;

  constructor(private config: QdrantConfig) {
    this.client = new QdrantClient({
      url: config.url,
      apiKey: config.apiKey
    });
  }

  /**
   * Initialize the Qdrant collection
   */
  async initialize(): Promise<void> {
    try {
      logger.info('🔄 Initializing Qdrant memory service...');

      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        col => col.name === this.config.collectionName
      );

      if (!collectionExists) {
        // Create collection
        await this.client.createCollection(this.config.collectionName, {
          vectors: {
            size: this.config.vectorSize,
            distance: this.config.distance
          },
          optimizers_config: {
            default_segment_number: 2,
            max_segment_size: 20000,
            memmap_threshold: 20000,
            indexing_threshold: 20000,
            flush_interval_sec: 5,
            max_optimization_threads: 1
          }
        });

        logger.info('✅ Created Qdrant collection', {
          name: this.config.collectionName,
          vectorSize: this.config.vectorSize,
          distance: this.config.distance
        });
      } else {
        logger.info('✅ Qdrant collection already exists', {
          name: this.config.collectionName
        });
      }

      // Create indexes for better performance
      await this.createIndexes();

      this.isInitialized = true;
      logger.info('✅ Qdrant memory service initialized');

    } catch (error) {
      logger.error('Failed to initialize Qdrant memory service:', error);
      throw new MemoryError('Failed to initialize Qdrant memory service', error);
    }
  }

  /**
   * Store a conversation memory with vector embedding
   */
  async storeMemory(memory: ConversationMemory): Promise<void> {
    if (!this.isInitialized) {
      throw new MemoryError('Qdrant memory service not initialized');
    }

    try {
      const point = {
        id: memory.id,
        vector: memory.embedding,
        payload: {
          serverId: memory.serverId,
          channelId: memory.channelId,
          userId: memory.userId,
          content: memory.content,
          metadata: memory.metadata,
          importance: memory.importance,
          createdAt: memory.createdAt.toISOString(),
          expiresAt: memory.expiresAt?.toISOString()
        }
      };

      await this.client.upsert(this.config.collectionName, {
        wait: true,
        points: [point]
      });

      logger.debug('💾 Stored memory in Qdrant', {
        id: memory.id,
        serverId: memory.serverId,
        userId: memory.userId,
        importance: memory.importance
      });

    } catch (error) {
      logger.error('Failed to store memory in Qdrant:', error);
      throw new MemoryError(`Failed to store memory ${memory.id}`, error);
    }
  }

  /**
   * Search for similar memories using vector similarity
   */
  async searchSimilarMemories(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    if (!this.isInitialized) {
      throw new MemoryError('Qdrant memory service not initialized');
    }

    try {
      const searchResult = await this.client.search(this.config.collectionName, {
        vector: query.vector,
        limit: query.limit,
        score_threshold: query.threshold,
        filter: query.filter,
        with_payload: true
      });

      const results: VectorSearchResult[] = searchResult.map(result => ({
        id: result.id as string,
        score: result.score,
        payload: {
          id: result.id as string,
          serverId: result.payload?.serverId as string,
          channelId: result.payload?.channelId as string,
          userId: result.payload?.userId as string,
          content: result.payload?.content as string,
          embedding: [], // Not returned in search
          metadata: result.payload?.metadata as MemoryMetadata,
          importance: result.payload?.importance as number,
          createdAt: new Date(result.payload?.createdAt as string),
          expiresAt: result.payload?.expiresAt ? new Date(result.payload.expiresAt as string) : undefined
        }
      }));

      logger.debug('🔍 Searched memories in Qdrant', {
        queryLimit: query.limit,
        resultsCount: results.length,
        threshold: query.threshold
      });

      return results;

    } catch (error) {
      logger.error('Failed to search memories in Qdrant:', error);
      throw new MemoryError('Failed to search memories', error);
    }
  }

  /**
   * Get memories for a specific user in a server
   */
  async getUserMemories(
    serverId: string, 
    userId: string, 
    limit: number = 50
  ): Promise<ConversationMemory[]> {
    if (!this.isInitialized) {
      throw new MemoryError('Qdrant memory service not initialized');
    }

    try {
      const scrollResult = await this.client.scroll(this.config.collectionName, {
        filter: {
          must: [
            { key: 'serverId', match: { value: serverId } },
            { key: 'userId', match: { value: userId } }
          ]
        },
        limit,
        with_payload: true,
        with_vector: false
      });

      const memories: ConversationMemory[] = scrollResult.points.map(point => ({
        id: point.id as string,
        serverId: point.payload?.serverId as string,
        channelId: point.payload?.channelId as string,
        userId: point.payload?.userId as string,
        content: point.payload?.content as string,
        embedding: [], // Not needed for this query
        metadata: point.payload?.metadata as MemoryMetadata,
        importance: point.payload?.importance as number,
        createdAt: new Date(point.payload?.createdAt as string),
        expiresAt: point.payload?.expiresAt ? new Date(point.payload.expiresAt as string) : undefined
      }));

      logger.debug('👤 Retrieved user memories', {
        serverId,
        userId,
        count: memories.length
      });

      return memories;

    } catch (error) {
      logger.error('Failed to get user memories:', error);
      throw new MemoryError(`Failed to get memories for user ${userId}`, error);
    }
  }

  /**
   * Delete a specific memory
   */
  async deleteMemory(memoryId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new MemoryError('Qdrant memory service not initialized');
    }

    try {
      await this.client.delete(this.config.collectionName, {
        wait: true,
        points: [memoryId]
      });

      logger.debug('🗑️ Deleted memory from Qdrant', { memoryId });

    } catch (error) {
      logger.error('Failed to delete memory:', error);
      throw new MemoryError(`Failed to delete memory ${memoryId}`, error);
    }
  }

  /**
   * Delete expired memories
   */
  async cleanupExpiredMemories(): Promise<number> {
    if (!this.isInitialized) {
      throw new MemoryError('Qdrant memory service not initialized');
    }

    try {
      const now = new Date().toISOString();
      
      // Find expired memories
      const scrollResult = await this.client.scroll(this.config.collectionName, {
        filter: {
          must: [
            { key: 'expiresAt', range: { lt: now } }
          ]
        },
        limit: 1000,
        with_payload: false,
        with_vector: false
      });

      if (scrollResult.points.length === 0) {
        return 0;
      }

      // Delete expired memories
      const expiredIds = scrollResult.points.map(point => point.id as string);
      await this.client.delete(this.config.collectionName, {
        wait: true,
        points: expiredIds
      });

      logger.info('🧹 Cleaned up expired memories', {
        count: expiredIds.length
      });

      return expiredIds.length;

    } catch (error) {
      logger.error('Failed to cleanup expired memories:', error);
      throw new MemoryError('Failed to cleanup expired memories', error);
    }
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<{
    totalMemories: number;
    collectionInfo: any;
    indexInfo: any;
  }> {
    if (!this.isInitialized) {
      throw new MemoryError('Qdrant memory service not initialized');
    }

    try {
      const collectionInfo = await this.client.getCollection(this.config.collectionName);
      
      return {
        totalMemories: collectionInfo.points_count || 0,
        collectionInfo: {
          status: collectionInfo.status,
          vectorsCount: collectionInfo.vectors_count,
          indexedVectorsCount: collectionInfo.indexed_vectors_count,
          pointsCount: collectionInfo.points_count,
          segmentsCount: collectionInfo.segments_count
        },
        indexInfo: collectionInfo.payload_schema || {}
      };

    } catch (error) {
      logger.error('Failed to get Qdrant stats:', error);
      throw new MemoryError('Failed to get memory statistics', error);
    }
  }

  /**
   * Health check for Qdrant service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      if (!this.isInitialized) {
        return {
          status: 'unhealthy',
          details: { error: 'Service not initialized' }
        };
      }

      // Test connection by getting collection info
      const collectionInfo = await this.client.getCollection(this.config.collectionName);
      
      return {
        status: 'healthy',
        details: {
          collection: this.config.collectionName,
          status: collectionInfo.status,
          pointsCount: collectionInfo.points_count,
          vectorsCount: collectionInfo.vectors_count,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Create indexes for better query performance
   */
  private async createIndexes(): Promise<void> {
    try {
      // Create payload indexes for common query fields
      const indexFields = ['serverId', 'channelId', 'userId', 'importance', 'createdAt'];
      
      for (const field of indexFields) {
        try {
          await this.client.createPayloadIndex(this.config.collectionName, {
            field_name: field,
            field_schema: field === 'importance' ? 'integer' : 'keyword'
          });
        } catch (error) {
          // Index might already exist, which is fine
          logger.debug(`Index for ${field} might already exist`);
        }
      }

      logger.debug('✅ Created Qdrant payload indexes');

    } catch (error) {
      logger.warn('Failed to create some Qdrant indexes:', error);
      // Don't throw error as this is not critical
    }
  }
}
