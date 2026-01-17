import { logger } from '@/observability/logger';

/**
 * Simple in-memory state manager for bot enable/disable functionality
 */
export class BotStateManager {
  private static instance: BotStateManager | null = null;
  private botStates: Map<string, boolean> = new Map();

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
}

