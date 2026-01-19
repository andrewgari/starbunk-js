/**
 * Ollama Embedding Provider
 *
 * Provides embedding generation via Ollama's local API.
 */

import { logLayer } from '../../observability/log-layer';
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
  private modelManager: OllamaModelManager;

  constructor(apiUrl?: string, defaultModel?: string) {
    this.apiUrl = apiUrl || process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434';
    this.defaultModel = defaultModel || DEFAULT_EMBEDDING_MODELS.ollama;
    this.modelManager = new OllamaModelManager({ apiUrl: this.apiUrl });
  }

  supportsEmbeddings(): boolean {
    return !!this.apiUrl;
  }

  getModelManager(): OllamaModelManager {
    return this.modelManager;
  }

  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    const model = options?.model || this.defaultModel;
    const url = `${this.apiUrl}/api/embeddings`;

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
      throw new Error(`Ollama embedding API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as OllamaEmbeddingResponse;

    logger.withMetadata({ model, dimensions: data.embedding.length }).debug('Ollama embedding successful');

    return {
      embedding: data.embedding,
      model,
      provider: this.name,
    };
  }

  async generateEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingResult[]> {
    // Ollama doesn't have a batch endpoint, so we generate one at a time
    const results: EmbeddingResult[] = [];
    for (const text of texts) {
      const result = await this.generateEmbedding(text, options);
      results.push(result);
    }
    return results;
  }
}

