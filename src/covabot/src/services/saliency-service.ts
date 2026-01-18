import { QdrantClient } from '@qdrant/js-client-rest';
import { SaliencyResult, SimulacrumProfile } from '@starbunk/shared';
import { logger } from '@/observability/logger';
import { getEmbeddingService, EmbeddingService } from './embedding-service';

/**
 * Configuration for the Qdrant saliency service
 */
export interface SaliencyServiceConfig {
  qdrantUrl: string;
  qdrantApiKey?: string;
  vectorDimension: number;  // Typically 384 for MiniLM-L6-v2
}

/**
 * Default configuration
 */
export const DEFAULT_SALIENCY_CONFIG: SaliencyServiceConfig = {
  qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
  qdrantApiKey: process.env.QDRANT_API_KEY,
  vectorDimension: 384,
};

/**
 * Service for checking message saliency against a bot's interests
 * Uses Qdrant vector database for semantic similarity search
 */
export class SaliencyService {
  private config: SaliencyServiceConfig;
  private client: QdrantClient;
  private embeddingService: EmbeddingService;
  private isInitialized = false;

  constructor(config: Partial<SaliencyServiceConfig> = {}) {
    this.config = { ...DEFAULT_SALIENCY_CONFIG, ...config };

    this.client = new QdrantClient({
      url: this.config.qdrantUrl,
      apiKey: this.config.qdrantApiKey,
    });

    this.embeddingService = getEmbeddingService();
  }

  /**
   * Initialize the service and ensure collections exist
   */
  async initialize(profile: SimulacrumProfile): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.embeddingService.initialize();
      await this.ensureCollection(profile);
      this.isInitialized = true;
      logger.info(`[SaliencyService] Initialized for profile: ${profile.id}`);
    } catch (error) {
      logger.error('[SaliencyService] Initialization failed:', error as Error);
      throw error;
    }
  }

  /**
   * Ensure the interests collection exists for a profile
   */
  private async ensureCollection(profile: SimulacrumProfile): Promise<void> {
    const collectionName = profile.saliency.qdrantCollection;

    try {
      await this.client.getCollection(collectionName);
      logger.debug(`[SaliencyService] Collection ${collectionName} exists`);
    } catch {
      // Collection doesn't exist, create it
      logger.info(`[SaliencyService] Creating collection: ${collectionName}`);
      await this.client.createCollection(collectionName, {
        vectors: {
          size: this.config.vectorDimension,
          distance: 'Cosine',
        },
      });

      // Seed with profile's interests if any
      if (profile.identity.interests.length > 0) {
        await this.seedInterests(profile);
      }
    }
  }

  /**
   * Seed the collection with interest vectors from the profile
   */
  async seedInterests(profile: SimulacrumProfile): Promise<void> {
    const collectionName = profile.saliency.qdrantCollection;
    const interests = profile.identity.interests;

    if (interests.length === 0) {
      logger.warn(`[SaliencyService] No interests to seed for ${profile.id}`);
      return;
    }

    logger.info(`[SaliencyService] Seeding ${interests.length} interests`);

    const points = await Promise.all(
      interests.map(async (interest, index) => {
        const vector = await this.embeddingService.embed(interest);
        return {
          id: index + 1,
          vector,
          payload: { interest, profile_id: profile.id },
        };
      })
    );

    await this.client.upsert(collectionName, {
      wait: true,
      points,
    });

    logger.info(`[SaliencyService] Seeded ${points.length} interest vectors`);
  }

  /**
   * Check if a message is salient (interesting) to the bot
   * @param message - The message content to check
   * @param profile - The bot's simulacrum profile
   * @param isDirectMention - Whether the bot was directly mentioned
   * @returns SaliencyResult with decision and score
   */
  async checkSaliency(
    message: string,
    profile: SimulacrumProfile,
    isDirectMention = false
  ): Promise<SaliencyResult> {
    // Direct mentions always pass
    if (isDirectMention) {
      return {
        shouldRespond: true,
        score: 1.0,
        reason: 'direct_mention',
      };
    }

    // Random chime check (before expensive embedding)
    if (Math.random() < profile.saliency.randomChimeRate) {
      return {
        shouldRespond: true,
        score: profile.saliency.interestThreshold,
        reason: 'random_chime',
      };
    }

    try {
      const messageVector = await this.embeddingService.embed(message);
      const results = await this.client.search(profile.saliency.qdrantCollection, {
        vector: messageVector,
        limit: 1,
        score_threshold: 0, // Get all results to see the score
      });

      if (results.length === 0) {
        return {
          shouldRespond: false,
          score: 0,
          reason: 'below_threshold',
        };
      }

      const topMatch = results[0];
      const score = topMatch.score;
      const matchedInterest = (topMatch.payload as { interest?: string })?.interest;

      if (score >= profile.saliency.interestThreshold) {
        return {
          shouldRespond: true,
          score,
          reason: 'interest',
          matchedInterest,
        };
      }

      return {
        shouldRespond: false,
        score,
        reason: 'below_threshold',
        matchedInterest,
      };
    } catch (error) {
      logger.error('[SaliencyService] Saliency check failed:', error as Error);
      // On error, default to not responding (fail safe)
      return {
        shouldRespond: false,
        score: 0,
        reason: 'below_threshold',
      };
    }
  }
}

// Singleton instance
let saliencyServiceInstance: SaliencyService | null = null;

/**
 * Get or create the singleton saliency service instance
 */
export function getSaliencyService(config?: Partial<SaliencyServiceConfig>): SaliencyService {
  if (!saliencyServiceInstance) {
    saliencyServiceInstance = new SaliencyService(config);
  }
  return saliencyServiceInstance;
}

