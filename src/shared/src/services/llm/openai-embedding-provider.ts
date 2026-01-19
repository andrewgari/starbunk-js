/**
 * OpenAI Embedding Provider
 *
 * Provides embedding generation via OpenAI's API.
 */

import { logLayer } from '../../observability/log-layer';
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
    this.defaultModel = defaultModel || DEFAULT_EMBEDDING_MODELS.openai;
  }

  supportsEmbeddings(): boolean {
    return !!this.client;
  }

  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult> {
    if (!this.client) {
      throw new Error('OpenAI API key not configured');
    }

    const model = options?.model || this.defaultModel;

    logger.withMetadata({ model, textLength: text.length }).debug('Generating OpenAI embedding');

    const response = await this.client.embeddings.create({
      model,
      input: text,
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      throw new Error('OpenAI embedding response missing embedding data');
    }

    const tokensUsed = response.usage?.total_tokens;

    logger.withMetadata({ model, dimensions: embedding.length, tokensUsed }).debug('OpenAI embedding successful');

    return {
      embedding,
      model: response.model,
      provider: this.name,
      tokensUsed,
    };
  }

  async generateEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingResult[]> {
    if (!this.client) {
      throw new Error('OpenAI API key not configured');
    }

    const model = options?.model || this.defaultModel;

    logger.withMetadata({ model, count: texts.length }).debug('Generating OpenAI embeddings (batch)');

    const response = await this.client.embeddings.create({
      model,
      input: texts,
    });

    const tokensUsed = response.usage?.total_tokens;

    logger.withMetadata({ model, count: texts.length, tokensUsed }).debug('OpenAI embeddings successful');

    return response.data.map((item) => ({
      embedding: item.embedding,
      model: response.model,
      provider: this.name,
      tokensUsed: tokensUsed ? Math.floor(tokensUsed / texts.length) : undefined,
    }));
  }
}

