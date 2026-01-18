import { Message } from 'discord.js';
import {
  SimulacrumProfile,
  SimulacrumDecision,
  SaliencyResult,
  SocialBatteryResult,
  buildSelectiveObserverPrompt,
  IGNORE_CONVERSATION_MARKER,
} from '@starbunk/shared';
import { logger } from '@/observability/logger';
import { getSaliencyService, SaliencyService } from './saliency-service';
import { getBotFrequencyService, BotFrequencyService } from './bot-frequency-service';
import { getDefaultProfile } from '../profiles/cova-profile';

/**
 * Configuration for the Simulacrum Service
 */
export interface SimulacrumServiceConfig {
  profile?: SimulacrumProfile;
  enableSaliency?: boolean;
  enableSocialBattery?: boolean;
}

/**
 * The main orchestration service for the Cognitive Simulacrum
 * Implements the "Selective Observer" pattern:
 * 1. Check saliency (is this message interesting?)
 * 2. Check social battery (should we speak right now?)
 * 3. Generate response only if both pass
 */
export class SimulacrumService {
  private profile: SimulacrumProfile;
  private saliencyService: SaliencyService;
  private frequencyService: BotFrequencyService;
  private config: Required<SimulacrumServiceConfig>;
  private isInitialized = false;

  constructor(config: SimulacrumServiceConfig = {}) {
    this.profile = config.profile || getDefaultProfile();
    this.saliencyService = getSaliencyService();
    this.frequencyService = getBotFrequencyService();
    this.config = {
      profile: this.profile,
      enableSaliency: config.enableSaliency ?? true,
      enableSocialBattery: config.enableSocialBattery ?? true,
    };
  }

  /**
   * Initialize all underlying services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      logger.info(`[SimulacrumService] Initializing for profile: ${this.profile.id}`);

      if (this.config.enableSaliency) {
        await this.saliencyService.initialize(this.profile);
      }

      if (this.config.enableSocialBattery) {
        await this.frequencyService.connect();
      }

      this.isInitialized = true;
      logger.info(`[SimulacrumService] Initialization complete`);
    } catch (error) {
      logger.error('[SimulacrumService] Initialization failed:', error as Error);
      throw error;
    }
  }

  /**
   * Evaluate whether the simulacrum should respond to a message
   * This is the main "Selective Observer" decision logic
   * @throws Error if service not initialized
   */
  async evaluateMessage(
    message: Message,
    isDirectMention: boolean = false
  ): Promise<SimulacrumDecision> {
    // Initialization guard
    if (!this.isInitialized) {
      throw new Error('[SimulacrumService] Service not initialized. Call initialize() first.');
    }

    // Direct mentions bypass all filters
    if (isDirectMention) {
      return {
        shouldRespond: true,
        saliency: {
          shouldRespond: true,
          score: 1.0,
          reason: 'direct_mention',
        },
        battery: {
          canSpeak: true,
          currentCount: 0,
          maxAllowed: this.profile.socialBattery.maxMessages,
          windowResetSeconds: 0,
          reason: 'ok',
        },
        overrideReason: 'direct_tag',
      };
    }

    // Step A: Saliency Check
    let saliencyResult: SaliencyResult;
    if (this.config.enableSaliency) {
      saliencyResult = await this.saliencyService.checkSaliency(
        message.content,
        this.profile,
        isDirectMention
      );
    } else {
      saliencyResult = { shouldRespond: true, score: 1.0, reason: 'interest' };
    }

    // Early exit if not salient
    if (!saliencyResult.shouldRespond) {
      return {
        shouldRespond: false,
        saliency: saliencyResult,
        battery: {
          canSpeak: true,
          currentCount: 0,
          maxAllowed: this.profile.socialBattery.maxMessages,
          windowResetSeconds: 0,
          reason: 'ok',
        },
      };
    }

    // Step B: Social Battery Check
    let batteryResult: SocialBatteryResult;
    if (this.config.enableSocialBattery) {
      batteryResult = await this.frequencyService.checkBattery(
        message.channelId,
        this.profile.id,
        this.profile
      );
    } else {
      batteryResult = {
        canSpeak: true,
        currentCount: 0,
        maxAllowed: this.profile.socialBattery.maxMessages,
        windowResetSeconds: 0,
        reason: 'ok',
      };
    }

    return {
      shouldRespond: saliencyResult.shouldRespond && batteryResult.canSpeak,
      saliency: saliencyResult,
      battery: batteryResult,
    };
  }

  /**
   * Build the system prompt for the LLM based on profile and context
   */
  buildSystemPrompt(saliencyScore: number, channelContext?: string): string {
    return buildSelectiveObserverPrompt(this.profile, saliencyScore, channelContext);
  }

  /**
   * Record that a message was sent (consumes social battery)
   * Fails silently to avoid disrupting message flow if Redis is unavailable
   */
  async recordMessageSent(channelId: string): Promise<void> {
    if (this.config.enableSocialBattery) {
      try {
        await this.frequencyService.recordMessage(channelId, this.profile.id, this.profile);
      } catch (error) {
        logger.error('[SimulacrumService] Failed to record message, continuing anyway:', error as Error);
      }
    }
  }

  /**
   * Check if a response is the ignore marker
   */
  isIgnoreResponse(response: string): boolean {
    return response.trim() === IGNORE_CONVERSATION_MARKER;
  }

  /**
   * Get the current profile
   */
  getProfile(): SimulacrumProfile {
    return this.profile;
  }

  /**
   * Update the profile at runtime
   */
  setProfile(profile: SimulacrumProfile): void {
    this.profile = profile;
    this.config.profile = profile;
  }
}

// Singleton instance
let simulacrumServiceInstance: SimulacrumService | null = null;

/**
 * Get or create the singleton simulacrum service instance.
 *
 * Note: Configuration is only applied on first initialization.
 * Subsequent calls with a config will be ignored and the existing instance will be reused.
 */
export function getSimulacrumService(
  config?: SimulacrumServiceConfig
): SimulacrumService {
  if (!simulacrumServiceInstance) {
    simulacrumServiceInstance = new SimulacrumService(config);
  } else if (config) {
    logger.warn('[SimulacrumService] getSimulacrumService called with config after instance was created; config will be ignored');
  }
  return simulacrumServiceInstance;
}

