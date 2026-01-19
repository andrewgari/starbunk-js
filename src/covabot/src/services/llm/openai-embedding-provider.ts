/**
 * OpenAI Embedding Provider
 *
 * Generates embeddings using OpenAI's embedding models.
 * Default model: text-embedding-3-small (1536 dimensions, cost-effective)
 */

import { logLayer } from '@starbunk/shared/observability/log-layer';
import OpenAI from 'openai';
import {
  EmbeddingProvider,
  EmbeddingResult,
  EmbeddingOptions,
  DEFAULT_EMBEDDING_MODELS,
} from './embedding-provider';

const logger = logLayer.withPrefix('OpenAIEmbeddingProvider');

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai';
  private readonly client: OpenAI | null;
  private readonly defaultModel: string;

  constructor(apiKey?: string, defaultModel?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    this.client = key ? new OpenAI({ apiKey: key }) : null;
    this.defaultModel = defaultModel || process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODELS.openai;
  }

  supportsEmbeddings(): boolean {
    return !!this.client;
  }

  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const model = options?.model || this.defaultModel;

    logger.withMetadata({ model, textLength: text.length }).debug('Generating OpenAI embedding');

    const response = await this.client.embeddings.create({
      model,
      input: text,
    });

    const embedding = response.data[0].embedding;
    const tokensUsed = response.usage?.total_tokens;

    logger.withMetadata({
      model,
      dimensions: embedding.length,
      tokensUsed,
    }).debug('OpenAI embedding generated');

    return {
      embedding,
      model,
      provider: this.name,
      tokensUsed,
    };
  }

  async generateEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingResult[]> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const model = options?.model || this.defaultModel;

    logger.withMetadata({ model, batchSize: texts.length }).debug('Generating OpenAI embeddings batch');

    // OpenAI supports batch embeddings
    const response = await this.client.embeddings.create({
      model,
      input: texts,
    });

    const tokensUsed = response.usage?.total_tokens;
    const tokensPerItem = tokensUsed ? Math.ceil(tokensUsed / texts.length) : undefined;

    return response.data.map((item) => ({
      embedding: item.embedding,
      model,
      provider: this.name,
      tokensUsed: tokensPerItem,
    }));
  }
}

