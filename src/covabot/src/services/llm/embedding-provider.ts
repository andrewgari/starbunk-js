/**
 * Embedding Provider Interface
 *
 * Defines the contract for embedding generation providers.
 * Embeddings convert text into dense vector representations for semantic similarity.
 */

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  provider: string;
  tokensUsed?: number;
}

export interface EmbeddingOptions {
  model?: string;
}

/**
 * Abstract Embedding Provider interface
 */
export interface EmbeddingProvider {
  /** Provider name for logging/identification */
  readonly name: string;

  /** Check if this provider supports embeddings */
  supportsEmbeddings(): boolean;

  /** Generate an embedding for a single text */
  generateEmbedding(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult>;

  /** Generate embeddings for multiple texts (batch) */
  generateEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingResult[]>;
}

/**
 * Configuration for embedding providers
 */
export interface EmbeddingProviderConfig {
  // Ollama (local, free)
  ollamaApiUrl?: string;
  ollamaEmbeddingModel?: string;

  // OpenAI (cloud, paid)
  openaiApiKey?: string;
  openaiEmbeddingModel?: string;
}

/**
 * Default embedding models by provider
 */
export const DEFAULT_EMBEDDING_MODELS = {
  ollama: 'nomic-embed-text', // 768 dimensions, good quality
  openai: 'text-embedding-3-small', // 1536 dimensions, very good quality
} as const;

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

/**
 * Find top-k most similar vectors
 */
export function findTopKSimilar(
  queryVector: number[],
  candidates: { id: string; vector: number[] }[],
  k: number = 5,
): { id: string; score: number }[] {
  const scored = candidates.map((c) => ({
    id: c.id,
    score: cosineSimilarity(queryVector, c.vector),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, k);
}

