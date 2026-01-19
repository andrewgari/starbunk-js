/**
 * Embedding Manager
 *
 * Manages embedding providers with fallback support, caching, and scheduled updates.
 * Priority: Ollama (local, free) -> OpenAI (cloud, paid)
 */

import { logLayer } from '@/observability/log-layer';
import {
  EmbeddingProvider,
  EmbeddingProviderConfig,
  EmbeddingResult,
  EmbeddingOptions,
  DEFAULT_EMBEDDING_MODELS,
} from './embedding-provider';
import { OllamaEmbeddingProvider } from './ollama-embedding-provider';
import { OpenAIEmbeddingProvider } from './openai-embedding-provider';
import { OllamaModelManager } from './ollama-model-manager';

const logger = logLayer.withPrefix('EmbeddingManager');

interface CacheEntry {
  embedding: number[];
  model: string;
  provider: string;
  cachedAt: number;
}

export class EmbeddingManager {
  private providers: EmbeddingProvider[] = [];
  private cache: Map<string, CacheEntry> = new Map();
  private readonly cacheTtlMs: number;
  private readonly maxCacheSize: number;
  private ollamaProvider: OllamaEmbeddingProvider | null = null;
  private modelManager: OllamaModelManager | null = null;

  constructor(config?: EmbeddingProviderConfig, cacheTtlMs: number = 3600000, maxCacheSize: number = 1000) {
    this.cacheTtlMs = cacheTtlMs;
    this.maxCacheSize = maxCacheSize;
    this.initializeProviders(config);
  }

  private initializeProviders(config?: EmbeddingProviderConfig): void {
    // 1. Ollama (primary - local, free)
    this.ollamaProvider = new OllamaEmbeddingProvider(config?.ollamaApiUrl, config?.ollamaEmbeddingModel);
    if (this.ollamaProvider.supportsEmbeddings()) {
      this.providers.push(this.ollamaProvider);
      this.modelManager = this.ollamaProvider.getModelManager();
      logger.info('Ollama embedding provider registered (primary)');
    }

    // 2. OpenAI (fallback - cloud, paid)
    const openai = new OpenAIEmbeddingProvider(config?.openaiApiKey, config?.openaiEmbeddingModel);
    if (openai.supportsEmbeddings()) {
      this.providers.push(openai);
      logger.info('OpenAI embedding provider registered (fallback)');
    }

    if (this.providers.length === 0) {
      logger.warn('No embedding providers configured! Vector features will not work.');
    } else {
      logger.withMetadata({
        providers: this.providers.map((p) => p.name),
        primary: this.providers[0]?.name,
      }).info('Embedding providers initialized');
    }
  }

  /**
   * Start scheduled model updates for embedding models
   * Models are automatically updated on a regular interval (default: weekly)
   */
  startScheduledUpdates(additionalModels: string[] = []): void {
    if (!this.modelManager) {
      logger.warn('No Ollama provider available, cannot start scheduled updates');
      return;
    }

    const models = [
      process.env.OLLAMA_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODELS.ollama,
      ...additionalModels,
    ];

    this.modelManager.startScheduledUpdates(models);
  }

  /**
   * Stop scheduled model updates
   */
  stopScheduledUpdates(): void {
    this.modelManager?.stopScheduledUpdates();
  }

  /**
   * Manually trigger a model update
   */
  async triggerModelUpdate(): Promise<{ model: string; success: boolean }[]> {
    if (!this.modelManager) {
      return [];
    }
    return this.modelManager.triggerUpdate();
  }

  /**
   * Get the model manager for advanced operations
   */
  getModelManager(): OllamaModelManager | null {
    return this.modelManager;
  }

  /**
   * Generate embedding with caching and fallback
   */
  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    // Input validation
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty text');
    }

    // Truncate very long text to prevent model issues (most models have ~8k token limit)
    // Rough estimate: 1 token ≈ 4 characters, so 32k chars ≈ 8k tokens
    const MAX_TEXT_LENGTH = 32000;
    const processedText = text.length > MAX_TEXT_LENGTH
      ? text.substring(0, MAX_TEXT_LENGTH)
      : text;

    if (text.length > MAX_TEXT_LENGTH) {
      logger.withMetadata({
        originalLength: text.length,
        truncatedLength: MAX_TEXT_LENGTH,
      }).warn('Text truncated for embedding generation');
    }

    // Check cache first
    const cacheKey = this.getCacheKey(processedText, options);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        embedding: cached.embedding,
        model: cached.model,
        provider: cached.provider + ' (cached)',
      };
    }

    // Generate new embedding
    const result = await this.generateWithFallback(processedText, options);

    // Cache the result
    this.addToCache(cacheKey, result);

    return result;
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    const uncachedTexts: { index: number; text: string }[] = [];

    // Check cache for each text
    for (let i = 0; i < texts.length; i++) {
      const cacheKey = this.getCacheKey(texts[i], options);
      const cached = this.getFromCache(cacheKey);

      if (cached) {
        results[i] = {
          embedding: cached.embedding,
          model: cached.model,
          provider: cached.provider + ' (cached)',
        };
      } else {
        uncachedTexts.push({ index: i, text: texts[i] });
      }
    }

    // Generate embeddings for uncached texts
    if (uncachedTexts.length > 0) {
      const newEmbeddings = await this.generateBatchWithFallback(
        uncachedTexts.map((u) => u.text),
        options,
      );

      for (let i = 0; i < uncachedTexts.length; i++) {
        const { index, text } = uncachedTexts[i];
        results[index] = newEmbeddings[i];

        // Cache the result
        const cacheKey = this.getCacheKey(text, options);
        this.addToCache(cacheKey, newEmbeddings[i]);
      }
    }

    return results;
  }

  private async generateWithFallback(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    if (this.providers.length === 0) {
      throw new Error('No embedding providers available');
    }

    let lastError: Error | null = null;

    for (const provider of this.providers) {
      try {
        return await provider.generateEmbedding(text, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.withError(lastError).withMetadata({ provider: provider.name }).warn('Provider failed');
      }
    }

    throw lastError || new Error('All embedding providers failed');
  }

  private async generateBatchWithFallback(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingResult[]> {
    if (this.providers.length === 0) {
      throw new Error('No embedding providers available');
    }

    let lastError: Error | null = null;

    for (const provider of this.providers) {
      try {
        return await provider.generateEmbeddings(texts, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.withError(lastError).withMetadata({ provider: provider.name }).warn('Provider failed');
      }
    }

    throw lastError || new Error('All embedding providers failed');
  }

  hasAvailableProvider(): boolean {
    return this.providers.length > 0;
  }

  // Cache helper methods (continued in next edit)
  private getCacheKey(text: string, options?: EmbeddingOptions): string {
    return `${options?.model || 'default'}:${text}`;
  }

  private getFromCache(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > this.cacheTtlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry;
  }

  private addToCache(key: string, result: EmbeddingResult): void {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      embedding: result.embedding,
      model: result.model,
      provider: result.provider,
      cachedAt: Date.now(),
    });
  }

  clearCache(): void {
    this.cache.clear();
  }
}

