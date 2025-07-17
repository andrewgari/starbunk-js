// Embedding Service - Generate vector embeddings for text content
import { pipeline, Pipeline } from '@xenova/transformers';
import { logger } from '@starbunk/shared';
import { MemoryError } from '../../types';

/**
 * Service for generating vector embeddings from text content
 */
export class EmbeddingService {
  private model: Pipeline | null = null;
  private isInitialized = false;
  private readonly modelName = 'Xenova/all-MiniLM-L6-v2';
  private readonly vectorSize = 384;

  constructor() {}

  /**
   * Initialize the embedding model
   */
  async initialize(): Promise<void> {
    try {
      logger.info('🔄 Initializing embedding service...');
      
      // Load the embedding model
      this.model = await pipeline('feature-extraction', this.modelName);
      
      this.isInitialized = true;
      logger.info('✅ Embedding service initialized', {
        model: this.modelName,
        vectorSize: this.vectorSize
      });

    } catch (error) {
      logger.error('Failed to initialize embedding service:', error);
      throw new MemoryError('Failed to initialize embedding service', error);
    }
  }

  /**
   * Generate embedding vector for text content
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isInitialized || !this.model) {
      throw new MemoryError('Embedding service not initialized');
    }

    if (!text || text.trim().length === 0) {
      throw new MemoryError('Text content cannot be empty');
    }

    try {
      // Clean and prepare text
      const cleanText = this.preprocessText(text);
      
      // Generate embedding
      const result = await this.model(cleanText, {
        pooling: 'mean',
        normalize: true
      });

      // Extract the embedding vector
      const embedding = Array.from(result.data) as number[];

      if (embedding.length !== this.vectorSize) {
        throw new MemoryError(`Expected vector size ${this.vectorSize}, got ${embedding.length}`);
      }

      logger.debug('🔢 Generated embedding', {
        textLength: cleanText.length,
        vectorSize: embedding.length,
        textPreview: cleanText.substring(0, 50) + (cleanText.length > 50 ? '...' : '')
      });

      return embedding;

    } catch (error) {
      logger.error('Failed to generate embedding:', error);
      throw new MemoryError('Failed to generate embedding for text', error);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.isInitialized || !this.model) {
      throw new MemoryError('Embedding service not initialized');
    }

    if (texts.length === 0) {
      return [];
    }

    try {
      const embeddings: number[][] = [];
      
      // Process in batches to avoid memory issues
      const batchSize = 10;
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchEmbeddings = await Promise.all(
          batch.map(text => this.generateEmbedding(text))
        );
        embeddings.push(...batchEmbeddings);
      }

      logger.debug('🔢 Generated batch embeddings', {
        count: embeddings.length,
        batchSize
      });

      return embeddings;

    } catch (error) {
      logger.error('Failed to generate batch embeddings:', error);
      throw new MemoryError('Failed to generate batch embeddings', error);
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new MemoryError('Embeddings must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return Math.max(-1, Math.min(1, similarity)); // Clamp to [-1, 1]
  }

  /**
   * Find the most similar embedding from a list
   */
  findMostSimilar(
    queryEmbedding: number[], 
    candidateEmbeddings: { id: string; embedding: number[] }[]
  ): { id: string; similarity: number } | null {
    if (candidateEmbeddings.length === 0) {
      return null;
    }

    let bestMatch = candidateEmbeddings[0];
    let bestSimilarity = this.calculateSimilarity(queryEmbedding, bestMatch.embedding);

    for (let i = 1; i < candidateEmbeddings.length; i++) {
      const candidate = candidateEmbeddings[i];
      const similarity = this.calculateSimilarity(queryEmbedding, candidate.embedding);
      
      if (similarity > bestSimilarity) {
        bestMatch = candidate;
        bestSimilarity = similarity;
      }
    }

    return {
      id: bestMatch.id,
      similarity: bestSimilarity
    };
  }

  /**
   * Preprocess text before embedding generation
   */
  private preprocessText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s.,!?-]/g, '') // Remove special characters except basic punctuation
      .substring(0, 512); // Limit length to avoid model limits
  }

  /**
   * Get embedding service statistics
   */
  getStats(): {
    isInitialized: boolean;
    modelName: string;
    vectorSize: number;
  } {
    return {
      isInitialized: this.isInitialized,
      modelName: this.modelName,
      vectorSize: this.vectorSize
    };
  }

  /**
   * Health check for embedding service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      if (!this.isInitialized) {
        return {
          status: 'unhealthy',
          details: { error: 'Service not initialized' }
        };
      }

      // Test embedding generation with a simple text
      const testText = 'This is a test message for health check.';
      const embedding = await this.generateEmbedding(testText);

      return {
        status: 'healthy',
        details: {
          modelName: this.modelName,
          vectorSize: this.vectorSize,
          testEmbeddingSize: embedding.length,
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
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      this.model = null;
      this.isInitialized = false;
      logger.info('🧹 Embedding service cleaned up');
    } catch (error) {
      logger.error('Error during embedding service cleanup:', error);
    }
  }

  /**
   * Get the vector size for this embedding model
   */
  getVectorSize(): number {
    return this.vectorSize;
  }

  /**
   * Check if the service is ready to generate embeddings
   */
  isReady(): boolean {
    return this.isInitialized && this.model !== null;
  }

  /**
   * Generate embedding with retry logic
   */
  async generateEmbeddingWithRetry(
    text: string, 
    maxRetries: number = 3, 
    retryDelay: number = 1000
  ): Promise<number[]> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.generateEmbedding(text);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < maxRetries) {
          logger.warn(`Embedding generation attempt ${attempt} failed, retrying...`, {
            error: lastError.message,
            retryDelay
          });
          
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay *= 2; // Exponential backoff
        }
      }
    }

    throw new MemoryError(
      `Failed to generate embedding after ${maxRetries} attempts`, 
      lastError
    );
  }
}
