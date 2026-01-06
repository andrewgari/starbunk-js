import Redis from 'ioredis';
import { logger, ensureError } from '@starbunk/shared';

/**
 * Redis-based configuration service for BlueBot
 * Provides simple key-value lookups for user configuration
 * Replaces the Prisma/PostgreSQL dependency with lightweight Redis
 */
export class RedisConfigurationService {
	private redis: Redis | null = null;
	private isConnected = false;

	constructor() {
		// Lazy initialization - only connect when needed
	}

	/**
	 * Initialize Redis connection
	 */
	private async connect(): Promise<void> {
		if (this.isConnected && this.redis) {
			return;
		}

		try {
			const redisHost = process.env.REDIS_HOST || 'localhost';
			const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
			const redisPassword = process.env.REDIS_PASSWORD || undefined;
			const redisDb = parseInt(process.env.REDIS_DB || '0', 10);

			this.redis = new Redis({
				host: redisHost,
				port: redisPort,
				password: redisPassword,
				db: redisDb,
				lazyConnect: true,
				retryStrategy: (times) => {
					const delay = Math.min(times * 50, 2000);
					return delay;
				},
				maxRetriesPerRequest: 3,
			});

			// Set up event handlers
			this.redis.on('error', (error: unknown) => {
				logger.error('[RedisConfig] Connection error:', ensureError(error));
			});

			this.redis.on('connect', () => {
				logger.info('[RedisConfig] Connected to Redis');
			});

			this.redis.on('ready', () => {
				logger.info('[RedisConfig] Redis connection ready');
				this.isConnected = true;
			});

			this.redis.on('close', () => {
				logger.warn('[RedisConfig] Redis connection closed');
				this.isConnected = false;
			});

			// Connect to Redis
			await this.redis.connect();
			await this.redis.ping();

			logger.info(
				`[RedisConfig] Successfully connected to Redis at ${redisHost}:${redisPort} (db: ${redisDb})`,
			);
		} catch (error) {
			logger.error('[RedisConfig] Failed to connect to Redis:', ensureError(error));
			this.redis = null;
			this.isConnected = false;
			throw error;
		}
	}

	/**
	 * Get user ID by username
	 * @param username - The username to look up (case-insensitive)
	 * @returns The user ID or null if not found
	 */
	async getUserIdByUsername(username: string): Promise<string | null> {
		try {
			// Ensure we're connected
			if (!this.isConnected) {
				await this.connect();
			}

			if (!this.redis) {
				logger.error('[RedisConfig] Redis client not available');
				return null;
			}

			// Normalize username to lowercase for case-insensitive lookup
			const normalizedUsername = username.toLowerCase();
			const key = `user:username:${normalizedUsername}`;

			const userId = await this.redis.get(key);

			if (userId) {
				logger.debug(`[RedisConfig] Found user ID for username '${username}': ${userId}`);
			} else {
				logger.debug(`[RedisConfig] No user ID found for username '${username}'`);
			}

			return userId;
		} catch (error) {
			logger.error(`[RedisConfig] Failed to get user ID for username ${username}:`, ensureError(error));
			return null;
		}
	}

	/**
	 * Set user ID for a username
	 * @param username - The username
	 * @param userId - The Discord user ID
	 */
	async setUserIdByUsername(username: string, userId: string): Promise<void> {
		try {
			// Ensure we're connected
			if (!this.isConnected) {
				await this.connect();
			}

			if (!this.redis) {
				logger.error('[RedisConfig] Redis client not available');
				return;
			}

			// Normalize username to lowercase for case-insensitive lookup
			const normalizedUsername = username.toLowerCase();
			const key = `user:username:${normalizedUsername}`;

			await this.redis.set(key, userId);
			logger.info(`[RedisConfig] Set user ID for username '${username}': ${userId}`);
		} catch (error) {
			logger.error(`[RedisConfig] Failed to set user ID for username ${username}:`, ensureError(error));
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
			logger.info('[RedisConfig] Disconnected from Redis');
		}
	}
}

