import { logger } from '@/observability/logger';
import { getTraceService } from '@starbunk/shared/observability/trace-service';

/**
 * Represents a frequency override for a bot
 */
export interface FrequencyOverride {
  botName: string;
  originalFrequency: number; // Original with_chance value from YAML (0-100)
  currentFrequency: number; // Current override value (0-100)
  setAt: string; // ISO timestamp
  setBy: string; // Admin user ID who set the override
}

/**
 * Simple in-memory state manager for bot enable/disable and frequency control
 */
export class BotStateManager {
  private static instance: BotStateManager | null = null;
  private botStates: Map<string, boolean> = new Map();
  private botFrequencies: Map<string, FrequencyOverride> = new Map();

  private constructor() {
    logger.debug('BotStateManager instance created');
  }

  static getInstance(): BotStateManager {
    if (!BotStateManager.instance) {
      BotStateManager.instance = new BotStateManager();
    }
    return BotStateManager.instance;
  }

  /**
   * Enable a bot
   */
  enableBot(botName: string): boolean {
    this.botStates.set(botName, true);
    logger.withMetadata({ bot_name: botName }).info('Bot enabled');
    return true;
  }

  /**
   * Disable a bot
   */
  disableBot(botName: string): boolean {
    this.botStates.set(botName, false);
    logger.withMetadata({ bot_name: botName }).info('Bot disabled');
    return true;
  }

  /**
   * Check if a bot is enabled (defaults to true if not set)
   */
  isBotEnabled(botName: string): boolean {
    return this.botStates.get(botName) ?? true;
  }

  /**
   * Get all bot states
   */
  getAllStates(): Map<string, boolean> {
    return new Map(this.botStates);
  }

  /**
   * Set a frequency override for a bot
   * Tracks the original frequency from YAML on first override
   */
  setFrequency(botName: string, frequencyPercent: number, adminUserId: string, originalFrequency?: number): void {
    const tracing = getTraceService('bunkbot');
    const span = tracing.startSpan('frequency.override_set', {
      'bot.name': botName,
      'frequency.percent': frequencyPercent,
      'admin.user_id': adminUserId,
    });

    if (frequencyPercent < 0 || frequencyPercent > 100) {
      logger.withMetadata({
        bot_name: botName,
        frequency_percent: frequencyPercent,
        admin_id: adminUserId,
      }).warn('Invalid frequency percent provided, clamping to 0-100');
    }

    const clamped = Math.max(0, Math.min(100, frequencyPercent));
    const existing = this.botFrequencies.get(botName);

    const override: FrequencyOverride = {
      botName,
      originalFrequency: existing?.originalFrequency ?? originalFrequency ?? 100,
      currentFrequency: clamped,
      setAt: new Date().toISOString(),
      setBy: adminUserId,
    };

    this.botFrequencies.set(botName, override);
    
    tracing.addAttributes(span, {
      'frequency.clamped': clamped,
      'frequency.original': override.originalFrequency,
    });

    logger.withMetadata({
      bot_name: botName,
      frequency_percent: clamped,
      original_frequency: override.originalFrequency,
      admin_id: adminUserId,
    }).info('Frequency override set for bot');

    tracing.endSpan(span);
  }

  /**
   * Get the current frequency override for a bot (0-100), or undefined if none set
   */
  getFrequency(botName: string): number | undefined {
    return this.botFrequencies.get(botName)?.currentFrequency;
  }

  /**
   * Get the original frequency from YAML for a bot
   */
  getOriginalFrequency(botName: string): number | undefined {
    return this.botFrequencies.get(botName)?.originalFrequency;
  }

  /**
   * Reset a frequency override to the original YAML value
   * Returns true if override existed and was reset, false otherwise
   */
  resetFrequency(botName: string): boolean {
    const tracing = getTraceService('bunkbot');
    const span = tracing.startSpan('frequency.override_reset', {
      'bot.name': botName,
    });

    const existing = this.botFrequencies.get(botName);
    if (!existing) {
      logger.withMetadata({ bot_name: botName }).debug('No frequency override to reset');
      tracing.endSpan(span);
      return false;
    }

    this.botFrequencies.delete(botName);
    
    tracing.addAttributes(span, {
      'frequency.original': existing.originalFrequency,
    });

    logger.withMetadata({
      bot_name: botName,
      original_frequency: existing.originalFrequency,
    }).info('Frequency override reset for bot');

    tracing.endSpan(span);
    return true;
  }

  /**
   * Get all frequency overrides currently set
   */
  getAllFrequencies(): Map<string, FrequencyOverride> {
    return new Map(this.botFrequencies);
  }

  /**
   * Check if a bot has a frequency override
   */
  hasFrequencyOverride(botName: string): boolean {
    return this.botFrequencies.has(botName);
  }
}

