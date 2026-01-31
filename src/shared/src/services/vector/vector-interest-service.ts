/**
 * Vector Interest Service
 *
 * Semantic interest matching using vector embeddings.
 * Replaces keyword-based matching with semantic similarity.
 *
 * How it works:
 * 1. Profile interests are embedded and stored as vectors
 * 2. Incoming messages are embedded
 * 3. Cosine similarity determines interest score
 *
 * Benefits over keyword matching:
 * - "TS" matches "TypeScript" semantically
 * - "type safety" matches "strongly typed" interests
 * - No manual synonym lists needed
 */

import { logLayer } from '../../observability/log-layer';
import { VectorStore, SimilarityResult } from './vector-store';
import { EmbeddingManager } from '../llm/embedding-manager';

const logger = logLayer.withPrefix('VectorInterestService');

const INTEREST_COLLECTION = 'interests';

export interface InterestMatch {
  keyword: string;
  category: string | null;
  weight: number;
  score: number;
}

export interface VectorInterestResult {
  score: number;
  matches: VectorInterestMatch[];
  isInterested: boolean;
}

export interface VectorInterestMatch extends InterestMatch {
  semanticScore: number;
  originalInterest: string;
}

export interface ProfileWithInterests {
  id: string;
  personality: {
    interests: string[];
  };
}

export class VectorInterestService {
  private vectorStore: VectorStore;
  private embeddingManager: EmbeddingManager;
  private initialized: Map<string, boolean> = new Map();

  constructor(vectorStore: VectorStore, embeddingManager: EmbeddingManager) {
    this.vectorStore = vectorStore;
    this.embeddingManager = embeddingManager;
  }

  /**
   * Initialize interest vectors from a profile's configuration
   */
  async initializeFromProfile(profile: ProfileWithInterests): Promise<void> {
    if (!this.embeddingManager.hasAvailableProvider()) {
      logger.warn('No embedding provider available, skipping vector initialization');
      return;
    }

    const interests = profile.personality.interests;
    if (interests.length === 0) {
      logger.withMetadata({ profile_id: profile.id }).debug('No interests to initialize');
      return;
    }

    logger
      .withMetadata({
        profile_id: profile.id,
        interests_count: interests.length,
      })
      .info('Initializing interest vectors');

    // Clear existing interests for this profile
    this.vectorStore.deleteCollection(profile.id, INTEREST_COLLECTION);

    // Generate embeddings for all interests
    const embeddings = await this.embeddingManager.generateEmbeddings(interests);

    // Store each interest as a vector
    for (let i = 0; i < interests.length; i++) {
      const interest = interests[i];
      const embedding = embeddings[i];

      // Parse category if present (e.g., "tech:typescript" -> category: "tech", keyword: "typescript")
      const [category, keyword] = interest.includes(':')
        ? interest.split(':', 2)
        : [null, interest];

      await this.vectorStore.upsert({
        id: `${profile.id}:interest:${i}`,
        profileId: profile.id,
        collection: INTEREST_COLLECTION,
        text: keyword,
        vector: embedding.embedding,
        metadata: {
          category,
          originalInterest: interest,
          weight: 1.0,
        },
      });
    }

    this.initialized.set(profile.id, true);

    logger
      .withMetadata({
        profile_id: profile.id,
        vectors_stored: interests.length,
      })
      .info('Interest vectors initialized');
  }

  /**
   * Calculate semantic interest score for a message
   */
  async calculateInterestScore(
    profileId: string,
    messageContent: string,
    threshold: number = 0.5,
  ): Promise<VectorInterestResult> {
    if (!this.embeddingManager.hasAvailableProvider()) {
      return { score: 0, matches: [], isInterested: false };
    }

    // Generate embedding for the message
    const messageEmbedding = await this.embeddingManager.generateEmbedding(messageContent);

    // Search for similar interests
    const results = this.vectorStore.search(
      profileId,
      INTEREST_COLLECTION,
      messageEmbedding.embedding,
      5, // Top 5 matches
      0.3, // Minimum similarity
    );

    if (results.length === 0) {
      return { score: 0, matches: [], isInterested: false };
    }

    // Convert results to interest matches
    const matches = this.resultsToMatches(results);

    // Calculate aggregate score (average of top matches, weighted)
    const score = this.calculateAggregateScore(results);

    logger
      .withMetadata({
        profile_id: profileId,
        message_preview: messageContent.substring(0, 50),
        top_match: matches[0]?.keyword,
        top_score: matches[0]?.semanticScore?.toFixed(3),
        aggregate_score: score.toFixed(3),
      })
      .debug('Semantic interest score calculated');

    return {
      score,
      matches,
      isInterested: score >= threshold,
    };
  }

  /**
   * Check if profile is interested in a message
   */
  async isInterested(
    profileId: string,
    messageContent: string,
    threshold: number = 0.5,
  ): Promise<{ interested: boolean; score: number; topMatch: VectorInterestMatch | null }> {
    const result = await this.calculateInterestScore(profileId, messageContent, threshold);

    return {
      interested: result.isInterested,
      score: result.score,
      topMatch: result.matches[0] || null,
    };
  }

  private resultsToMatches(results: SimilarityResult[]): VectorInterestMatch[] {
    return results.map(r => ({
      keyword: r.text,
      category: (r.metadata?.category as string) || null,
      weight: (r.metadata?.weight as number) || 1.0,
      score: r.score,
      semanticScore: r.score,
      originalInterest: (r.metadata?.originalInterest as string) || r.text,
    }));
  }

  private calculateAggregateScore(results: SimilarityResult[]): number {
    if (results.length === 0) return 0;

    // Weighted average: higher scores contribute more
    let weightedSum = 0;
    let weightSum = 0;

    for (const result of results) {
      const weight = result.score; // Use score as weight (higher = more important)
      weightedSum += result.score * weight;
      weightSum += weight;
    }

    // Normalize and boost if multiple matches
    const avgScore = weightSum > 0 ? weightedSum / weightSum : 0;
    const multiMatchBonus = Math.min(0.1, (results.length - 1) * 0.03);

    return Math.min(1, avgScore + multiMatchBonus);
  }

  /**
   * Check if a profile has been initialized
   */
  isInitialized(profileId: string): boolean {
    return this.initialized.get(profileId) || false;
  }
}
