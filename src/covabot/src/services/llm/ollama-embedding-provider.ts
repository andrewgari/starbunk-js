/**
 * Ollama Embedding Provider
 *
 * Generates embeddings using local Ollama models.
 * Recommended model: nomic-embed-text (768 dimensions, fast, good quality)
 *
 * Supports auto-pull of missing embedding models via OllamaModelManager.
 */

import { logLayer } from '@starbunk/shared/observability/log-layer';
import {
  EmbeddingProvider,
  EmbeddingResult,
  EmbeddingOptions,
  DEFAULT_EMBEDDING_MODELS,
} from './embedding-provider';
import { OllamaModelManager } from './ollama-model-manager';

const logger = logLayer.withPrefix('OllamaEmbeddingProvider');

interface OllamaEmbeddingResponse {
  embedding: number[];
}

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'ollama';
  private readonly apiUrl: string;
  private readonly defaultModel: string;
  private readonly modelManager: OllamaModelManager;
  private modelChecked = false;

  constructor(apiUrl?: string, defaultModel?: string) {
    this.apiUrl = apiUrl || process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434';
    this.defaultModel = defaultModel || process.env.OLLAMA_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODELS.ollama;
    this.modelManager = new OllamaModelManager({ apiUrl: this.apiUrl });
  }

  supportsEmbeddings(): boolean {
    return !!this.apiUrl;
  }

  /**
   * Ensure the embedding model is available (pull if needed)
   */
  async ensureModel(model?: string): Promise<boolean> {
    const targetModel = model || this.defaultModel;
    return this.modelManager.ensureModel(targetModel);
  }

  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    const model = options?.model || this.defaultModel;
    const url = `${this.apiUrl}/api/embeddings`;

    // Check/pull model on first use
    if (!this.modelChecked) {
      this.modelChecked = true;
      await this.modelManager.ensureModel(model);
    }

    logger.withMetadata({ model, textLength: text.length }).debug('Generating Ollama embedding');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // If model not found, try to pull it
      if (response.status === 404 && errorText.includes('not found')) {
        logger.withMetadata({ model }).info('Model not found, attempting auto-pull');
        const pulled = await this.modelManager.pullModel(model);
        if (pulled) {
          // Retry the embedding request
          return this.generateEmbedding(text, options);
        }
      }

      throw new Error(`Ollama embedding error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as OllamaEmbeddingResponse;

    logger.withMetadata({
      model,
      dimensions: data.embedding.length,
    }).debug('Ollama embedding generated');

    return {
      embedding: data.embedding,
      model,
      provider: this.name,
    };
  }

  async generateEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingResult[]> {
    // Ollama doesn't have a batch API, so we process sequentially
    // For production, consider parallel processing with rate limiting
    const results: EmbeddingResult[] = [];

    for (const text of texts) {
      const result = await this.generateEmbedding(text, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Get the model manager for advanced operations
   */
  getModelManager(): OllamaModelManager {
    return this.modelManager;
  }
}

