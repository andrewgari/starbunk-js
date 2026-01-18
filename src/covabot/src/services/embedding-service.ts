import { logger } from '@/observability/logger';

// Type definitions for @xenova/transformers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pipeline = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tensor = any;

/**
 * Configuration for the embedding service
 */
export interface EmbeddingConfig {
  model: string;         // Model name (e.g., 'Xenova/all-MiniLM-L6-v2')
  cacheDir?: string;     // Optional cache directory for model files
  quantized?: boolean;   // Use quantized model for faster inference
}

/**
 * Default embedding configuration
 */
export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  model: 'Xenova/all-MiniLM-L6-v2', // 384-dimensional embeddings, fast and lightweight
  quantized: true,
};

/**
 * Service for generating text embeddings using @xenova/transformers
 * Provides semantic vector representations for saliency filtering
 */
export class EmbeddingService {
  private config: EmbeddingConfig;
  private pipeline: Pipeline | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(config: Partial<EmbeddingConfig> = {}) {
    this.config = { ...DEFAULT_EMBEDDING_CONFIG, ...config };
  }

  /**
   * Initialize the embedding pipeline (lazy loaded on first use)
   */
  async initialize(): Promise<void> {
    if (this.pipeline) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    await this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      logger.info(`[EmbeddingService] Loading model: ${this.config.model}`);

      // Dynamic import to avoid issues during testing
      const { pipeline } = await import('@xenova/transformers');

      this.pipeline = await pipeline('feature-extraction', this.config.model, {
        quantized: this.config.quantized,
        cache_dir: this.config.cacheDir,
      });

      logger.info(`[EmbeddingService] Model loaded successfully`);
    } catch (error) {
      logger.error('[EmbeddingService] Failed to load model:', error as Error);
      throw error;
    }
  }

  /**
   * Generate embedding for a single text
   * @param text - Text to embed
   * @returns Float array of embedding values (typically 384 dimensions)
   */
  async embed(text: string): Promise<number[]> {
    await this.initialize();

    if (!this.pipeline) {
      throw new Error('Embedding pipeline not initialized');
    }

    try {
      const output: Tensor = await this.pipeline(text, {
        pooling: 'mean',
        normalize: true,
      });

      // Convert tensor to array
      const embedding: number[] = Array.from(output.data as Float32Array);

      logger.debug(`[EmbeddingService] Generated embedding (dims=${embedding.length})`);
      return embedding;
    } catch (error) {
      logger.error('[EmbeddingService] Failed to generate embedding:', error as Error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts
   * @param texts - Array of texts to embed
   * @returns Array of embedding arrays
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      const embedding = await this.embed(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Check if the service is ready
   */
  isReady(): boolean {
    return this.pipeline !== null;
  }
}

// Singleton instance
let embeddingServiceInstance: EmbeddingService | null = null;

/**
 * Get or create the singleton embedding service instance
 */
export function getEmbeddingService(config?: Partial<EmbeddingConfig>): EmbeddingService {
  if (!embeddingServiceInstance) {
    embeddingServiceInstance = new EmbeddingService(config);
  }
  return embeddingServiceInstance;
}

