import { pipeline, Pipeline } from '@xenova/transformers';
import { logger } from '@starbunk/shared';
import { EmbeddingConfig } from '../types/memoryTypes';

/**
 * Local embedding service using sentence-transformers
 * Provides text-to-vector conversion for semantic search
 */
export class EmbeddingService {
	private static instance: EmbeddingService;
	private pipeline: Pipeline | null = null;
	private config: EmbeddingConfig;
	private cache = new Map<string, number[]>();
	private isInitialized = false;
	private initializationPromise: Promise<void> | null = null;

	constructor() {
		this.config = {
			model: process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2',
			dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '384'),
			batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '32'),
			cacheSize: parseInt(process.env.EMBEDDING_CACHE_SIZE || '1000'),
			timeout: parseInt(process.env.EMBEDDING_TIMEOUT || '30000'),
		};

		logger.info(`[EmbeddingService] Configured with model: ${this.config.model}`);
	}

	static getInstance(): EmbeddingService {
		if (!EmbeddingService.instance) {
			EmbeddingService.instance = new EmbeddingService();
		}
		return EmbeddingService.instance;
	}

	/**
	 * Initialize the embedding model
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		if (this.initializationPromise) {
			return this.initializationPromise;
		}

		this.initializationPromise = this._initialize();
		return this.initializationPromise;
	}

	private async _initialize(): Promise<void> {
		try {
			logger.info(`[EmbeddingService] Loading embedding model: ${this.config.model}`);
			
			const startTime = Date.now();
			this.pipeline = await pipeline('feature-extraction', this.config.model, {
				quantized: true, // Use quantized model for better performance
				progress_callback: (progress: any) => {
					if (progress.status === 'downloading') {
						logger.debug(`[EmbeddingService] Downloading: ${progress.name} (${Math.round(progress.progress)}%)`);
					}
				},
			}) as any;

			const loadTime = Date.now() - startTime;
			logger.info(`[EmbeddingService] Model loaded successfully in ${loadTime}ms`);

			// Test the model with a simple embedding
			const testEmbedding = await this.generateEmbedding('test');
			if (testEmbedding.length !== this.config.dimensions) {
				throw new Error(`Model dimension mismatch: expected ${this.config.dimensions}, got ${testEmbedding.length}`);
			}

			this.isInitialized = true;
			logger.info(`[EmbeddingService] Initialization complete. Model dimensions: ${testEmbedding.length}`);
		} catch (error) {
			logger.error(`[EmbeddingService] Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`);
			this.initializationPromise = null;
			throw error;
		}
	}

	/**
	 * Generate embedding for a single text
	 */
	async generateEmbedding(text: string): Promise<number[]> {
		await this.initialize();

		if (!this.pipeline) {
			throw new Error('Embedding service not initialized');
		}

		// Check cache first
		const cacheKey = this.getCacheKey(text);
		if (this.cache.has(cacheKey)) {
			// Move to end for LRU behavior
			const embedding = this.cache.get(cacheKey)!;
			this.cache.delete(cacheKey);
			this.cache.set(cacheKey, embedding);
			return embedding;
		}

		try {
			const startTime = Date.now();
			
			// Preprocess text
			const processedText = this.preprocessText(text);
			
			// Generate embedding
			const output = await this.pipeline(processedText, { 
				pooling: 'mean', 
				normalize: true 
			});
			
			const embedding = Array.from(output.data) as number[];
			const duration = Date.now() - startTime;

			// Cache the result
			this.cacheEmbedding(cacheKey, embedding);

			logger.debug(`[EmbeddingService] Generated embedding for text (${text.length} chars) in ${duration}ms`);
			return embedding;
		} catch (error) {
			logger.error(`[EmbeddingService] Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
			throw error;
		}
	}

	/**
	 * Generate embeddings for multiple texts in batches
	 */
	async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
		await this.initialize();

		if (texts.length === 0) {
			return [];
		}

		if (texts.length === 1) {
			return [await this.generateEmbedding(texts[0])];
		}

		const results: number[][] = [];
		const batchSize = this.config.batchSize;

		logger.debug(`[EmbeddingService] Generating embeddings for ${texts.length} texts in batches of ${batchSize}`);

		for (let i = 0; i < texts.length; i += batchSize) {
			const batch = texts.slice(i, i + batchSize);
			const batchResults = await Promise.all(
				batch.map(text => this.generateEmbedding(text))
			);
			results.push(...batchResults);

			// Log progress for large batches
			if (texts.length > batchSize) {
				const progress = Math.min(i + batchSize, texts.length);
				logger.debug(`[EmbeddingService] Batch progress: ${progress}/${texts.length}`);
			}
		}

		return results;
	}

	/**
	 * Preprocess text for better embedding quality
	 */
	private preprocessText(text: string): string {
		// Remove excessive whitespace
		let processed = text.trim().replace(/\s+/g, ' ');
		
		// Truncate very long texts (transformers have token limits)
		const maxLength = 512; // Conservative limit for most models
		if (processed.length > maxLength) {
			processed = processed.substring(0, maxLength).trim();
			// Try to end at a word boundary
			const lastSpace = processed.lastIndexOf(' ');
			if (lastSpace > maxLength * 0.8) {
				processed = processed.substring(0, lastSpace);
			}
		}

		return processed;
	}

	/**
	 * Generate cache key for text
	 */
	private getCacheKey(text: string): string {
		// Use a simple hash for cache key
		let hash = 0;
		for (let i = 0; i < text.length; i++) {
			const char = text.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return hash.toString();
	}

	/**
	 * Cache embedding with LRU size management
	 */
	private cacheEmbedding(key: string, embedding: number[]): void {
		// Implement LRU cache behavior
		if (this.cache.size >= this.config.cacheSize) {
			// Remove least recently used entry (first in Map)
			const firstKey = this.cache.keys().next().value;
			this.cache.delete(firstKey);
		}

		this.cache.set(key, embedding);
	}

	/**
	 * Get embedding service configuration
	 */
	getConfig(): EmbeddingConfig {
		return { ...this.config };
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; maxSize: number; hitRate: number } {
		return {
			size: this.cache.size,
			maxSize: this.config.cacheSize,
			hitRate: 0, // TODO: Implement hit rate tracking
		};
	}

	/**
	 * Clear the embedding cache
	 */
	clearCache(): void {
		this.cache.clear();
		logger.info('[EmbeddingService] Cache cleared');
	}

	/**
	 * Check if service is ready
	 */
	isReady(): boolean {
		return this.isInitialized && this.pipeline !== null;
	}

	/**
	 * Get health status
	 */
	getHealthStatus(): {
		status: 'healthy' | 'unhealthy';
		model: string;
		dimensions: number;
		cacheSize: number;
		isReady: boolean;
	} {
		return {
			status: this.isReady() ? 'healthy' : 'unhealthy',
			model: this.config.model,
			dimensions: this.config.dimensions,
			cacheSize: this.cache.size,
			isReady: this.isReady(),
		};
	}

	/**
	 * Cleanup resources
	 */
	async cleanup(): Promise<void> {
		this.cache.clear();
		this.pipeline = null;
		this.isInitialized = false;
		this.initializationPromise = null;
		logger.info('[EmbeddingService] Cleanup completed');
	}
}
