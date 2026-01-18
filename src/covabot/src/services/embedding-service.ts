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
      // Reset state to allow retry on next call
      this.initPromise = null;
      this.pipeline = null;
      logger.error('[EmbeddingService] Failed to load model:', error as Error);
      throw error;
    }
  }

  // Maximum text length for embedding (MiniLM-L6-v2 has 256 token limit)
  private static readonly MAX_TEXT_LENGTH = 8192;

  /**
   * Generate embedding for a single text
   * @param text - Text to embed
   * @returns Float array of embedding values (typically 384 dimensions)
   * @throws Error if text is empty or too long
   */
  async embed(text: string): Promise<number[]> {
    // Input validation
    if (!text || text.trim().length === 0) {
      throw new Error('[EmbeddingService] Cannot embed empty text');
    }

    // Truncate very long inputs to prevent model issues
    const truncatedText = text.length > EmbeddingService.MAX_TEXT_LENGTH
      ? text.substring(0, EmbeddingService.MAX_TEXT_LENGTH)
      : text;

    if (text.length > EmbeddingService.MAX_TEXT_LENGTH) {
      logger.warn(`[EmbeddingService] Text truncated from ${text.length} to ${EmbeddingService.MAX_TEXT_LENGTH} chars`);
    }

    await this.initialize();

    if (!this.pipeline) {
      throw new Error('Embedding pipeline not initialized');
    }

    try {
      const output: Tensor = await this.pipeline(truncatedText, {
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

