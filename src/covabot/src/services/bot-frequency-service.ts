import Redis from 'ioredis';
import { SocialBatteryResult, SimulacrumProfile } from '@starbunk/shared';
import { logger } from '@/observability/logger';

/**
 * Configuration for the Redis-based frequency service
 */
export interface BotFrequencyConfig {
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
  redisDb: number;
}

/**
 * Default configuration from environment
 */
export const DEFAULT_FREQUENCY_CONFIG: BotFrequencyConfig = {
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  redisPassword: process.env.REDIS_PASSWORD || undefined,
  redisDb: parseInt(process.env.REDIS_DB || '0', 10),
};

/**
 * Redis key patterns for social battery tracking
 */
const REDIS_KEYS = {
  /** Key for tracking message count in window: battery:{channel_id}:{bot_id} */
  batteryCount: (channelId: string, botId: string) => `battery:${channelId}:${botId}`,
  /** Key for tracking last message timestamp: cooldown:{channel_id}:{bot_id} */
  lastMessage: (channelId: string, botId: string) => `cooldown:${channelId}:${botId}`,
};

/**
 * Service for managing bot message frequency / "Social Battery"
 * Uses Redis to track message counts and enforce rate limits
 */
export class BotFrequencyService {
  private config: BotFrequencyConfig;
  private redis: Redis | null = null;
  private isConnected = false;

  constructor(config: Partial<BotFrequencyConfig> = {}) {
    this.config = { ...DEFAULT_FREQUENCY_CONFIG, ...config };
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.redis) return;

    try {
      this.redis = new Redis({
        host: this.config.redisHost,
        port: this.config.redisPort,
        password: this.config.redisPassword,
        db: this.config.redisDb,
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 200, 2000);
        },
      });

      await this.redis.connect();
      this.isConnected = true;
      logger.info(`[BotFrequencyService] Connected to Redis at ${this.config.redisHost}`);
    } catch (error) {
      logger.error('[BotFrequencyService] Failed to connect to Redis:', error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.isConnected = false;
      logger.info('[BotFrequencyService] Disconnected from Redis');
    }
  }

  /**
   * Check if the bot can send a message based on its social battery
   * @param channelId - Discord channel ID
   * @param botId - Bot's profile ID
   * @param profile - The bot's simulacrum profile
   * @returns SocialBatteryResult with can/cannot speak decision
   */
  async checkBattery(
    channelId: string,
    botId: string,
    profile: SimulacrumProfile
  ): Promise<SocialBatteryResult> {
    const countKey = REDIS_KEYS.batteryCount(channelId, botId);
    const cooldownKey = REDIS_KEYS.lastMessage(channelId, botId);
    const { maxMessages, windowMinutes, cooldownSeconds } = profile.socialBattery;

    try {
      // Ensure connection inside try block so connection errors trigger fail-open
      await this.ensureConnected();

      // Check cooldown first (forced gap between messages)
      const lastMessageTime = await this.redis!.get(cooldownKey);
      if (lastMessageTime) {
        const elapsed = (Date.now() - parseInt(lastMessageTime, 10)) / 1000;
        if (elapsed < cooldownSeconds) {
          return {
            canSpeak: false,
            currentCount: 0,
            maxAllowed: maxMessages,
            windowResetSeconds: cooldownSeconds - elapsed,
            reason: 'cooldown',
          };
        }
      }

      // Check message count in window
      const currentCount = parseInt(await this.redis!.get(countKey) || '0', 10);
      const ttl = await this.redis!.ttl(countKey);
      const windowResetSeconds = ttl > 0 ? ttl : windowMinutes * 60;

      if (currentCount >= maxMessages) {
        return {
          canSpeak: false,
          currentCount,
          maxAllowed: maxMessages,
          windowResetSeconds,
          reason: 'rate_limited',
        };
      }

      return {
        canSpeak: true,
        currentCount,
        maxAllowed: maxMessages,
        windowResetSeconds,
        reason: 'ok',
      };
    } catch (error) {
      logger.error('[BotFrequencyService] Battery check failed:', error as Error);
      // Fail open - allow message if Redis is unavailable
      return {
        canSpeak: true,
        currentCount: 0,
        maxAllowed: maxMessages,
        windowResetSeconds: windowMinutes * 60,
        reason: 'ok',
      };
    }
  }

  /**
   * Record that a message was sent (consumes battery)
   */
  async recordMessage(
    channelId: string,
    botId: string,
    profile: SimulacrumProfile
  ): Promise<void> {
    await this.ensureConnected();

    const countKey = REDIS_KEYS.batteryCount(channelId, botId);
    const cooldownKey = REDIS_KEYS.lastMessage(channelId, botId);
    const { windowMinutes, cooldownSeconds } = profile.socialBattery;

    try {
      // Use Redis transaction for atomic operations
      const pipeline = this.redis!.multi();

      // Increment message count
      pipeline.incr(countKey);
      // Set expiry on count key if new
      pipeline.expire(countKey, windowMinutes * 60);
      // Update last message timestamp
      pipeline.set(cooldownKey, Date.now().toString(), 'EX', cooldownSeconds);

      await pipeline.exec();

      logger.debug(`[BotFrequencyService] Recorded message for ${botId} in ${channelId}`);
    } catch (error) {
      logger.error('[BotFrequencyService] Failed to record message:', error as Error);
    }
  }

  /**
   * Reset the battery for a specific channel/bot combination
   */
  async resetBattery(channelId: string, botId: string): Promise<void> {
    await this.ensureConnected();

    const countKey = REDIS_KEYS.batteryCount(channelId, botId);
    const cooldownKey = REDIS_KEYS.lastMessage(channelId, botId);

    await this.redis!.del(countKey, cooldownKey);
    logger.info(`[BotFrequencyService] Reset battery for ${botId} in ${channelId}`);
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected || !this.redis) {
      await this.connect();
    }
  }
}

// Singleton instance
let frequencyServiceInstance: BotFrequencyService | null = null;

/**
 * Get or create the singleton frequency service instance
 */
export function getBotFrequencyService(
  config?: Partial<BotFrequencyConfig>
): BotFrequencyService {
  if (!frequencyServiceInstance) {
    frequencyServiceInstance = new BotFrequencyService(config);
  }
  return frequencyServiceInstance;
}

