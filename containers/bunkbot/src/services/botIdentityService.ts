import { BotIdentity } from '../types/botIdentity';
import { getBotIdentityFromDiscord } from '../core/get-bot-identity';
import { ConfigurationService } from './configurationService';
import { logger } from '@starbunk/shared';
import { Message } from 'discord.js';

/**
 * Service for resolving bot identities using database configuration
 * Provides server-specific identity resolution with proper caching
 */
export class BotIdentityService {
	private configService: ConfigurationService;
	// Cache key format: "userId:guildId" to handle server-specific identities
	private identityCache = new Map<string, BotIdentity>();
	private cacheExpiry = 60 * 60 * 1000; // 1 hour to reduce Discord API calls
	private lastCacheUpdate = new Map<string, number>();

	constructor(configService: ConfigurationService) {
		this.configService = configService;
	}

	/**
	 * Get bot identity for a specific user by username with server context
	 * @param username The username to look up (e.g., 'Chad', 'Guy', 'Venn')
	 * @param message Discord message for server context
	 * @param fallbackName Fallback bot name if user not found (deprecated - no longer used)
	 * @param forceRefresh Force refresh from Discord API
	 * @returns Promise<BotIdentity | null> - null if identity cannot be resolved
	 */
	async getBotIdentityByUsername(
		username: string,
		message?: Message,
		fallbackName?: string,
		forceRefresh: boolean = false
	): Promise<BotIdentity | null> {
		const guildId = message?.guild?.id || 'default';
		const cacheKey = `username:${username.toLowerCase()}:${guildId}`;

		// Check cache first (unless force refresh)
		if (!forceRefresh) {
			const cached = this.getCachedIdentity(cacheKey);
			if (cached) {
				return cached;
			}
		}

		try {
			// Get user ID from configuration service
			const userId = await this.configService.getUserIdByUsername(username);

			if (userId) {
				// Get server-specific Discord identity for this user
				const identity = await this.getBotIdentityByUserIdWithContext(
					userId,
					message,
					fallbackName || `${username}Bot`,
					forceRefresh
				);

				if (identity) {
					// Cache the result only if successful
					this.cacheIdentity(cacheKey, identity);
					return identity;
				} else {
					logger.warn(`Failed to get Discord identity for user '${username}' (${userId}), no fallback provided`);
					return null;
				}
			} else {
				logger.warn(`User '${username}' not found in configuration, no fallback provided`);
				return null;
			}
		} catch (error) {
			logger.error(`Failed to get bot identity for username '${username}':`, error as Error);
			return null; // No fallback - bot will remain silent
		}
	}

	/**
	 * Get bot identity for a specific user by user ID with server context
	 * @param userId Discord user ID
	 * @param message Discord message for server context
	 * @param fallbackName Fallback bot name if user not found (deprecated - no longer used)
	 * @param forceRefresh Force refresh from Discord API
	 * @returns Promise<BotIdentity | null> - null if identity cannot be resolved
	 */
	async getBotIdentityByUserIdWithContext(
		userId: string,
		message?: Message,
		fallbackName?: string,
		forceRefresh: boolean = false
	): Promise<BotIdentity | null> {
		const guildId = message?.guild?.id || 'default';
		const cacheKey = `userId:${userId}:${guildId}`;

		// Check cache first (unless force refresh)
		if (!forceRefresh) {
			const cached = this.getCachedIdentity(cacheKey);
			if (cached) {
				return cached;
			}
		}

		try {
			// Verify user exists in configuration
			const userConfig = await this.configService.getUserConfig(userId);

			if (userConfig && userConfig.isActive) {
				// Get server-specific Discord identity for this user
				const identity = await this.getServerSpecificIdentity(
					userId,
					guildId,
					fallbackName || `${userConfig.username}Bot`,
					forceRefresh
				);

				if (identity) {
					// Cache the result only if successful
					this.cacheIdentity(cacheKey, identity);
					return identity;
				} else {
					logger.warn(`Failed to get Discord identity for user ID '${userId}', no fallback provided`);
					return null;
				}
			} else {
				logger.warn(`User ID '${userId}' not found or inactive in configuration, no fallback provided`);
				return null;
			}
		} catch (error) {
			logger.error(`Failed to get bot identity for user ID '${userId}':`, error as Error);
			return null; // No fallback - bot will remain silent
		}
	}

	/**
	 * Legacy method for backward compatibility
	 * @deprecated Use getBotIdentityByUserIdWithContext instead
	 * @returns Promise<BotIdentity | null> - null if identity cannot be resolved
	 */
	async getBotIdentityByUserId(userId: string, fallbackName?: string): Promise<BotIdentity | null> {
		logger.warn('getBotIdentityByUserId is deprecated. Use getBotIdentityByUserIdWithContext for server-specific identities.');
		return this.getBotIdentityByUserIdWithContext(userId, undefined, fallbackName);
	}

	/**
	 * Get server-specific identity using Discord API
	 * This method ensures we get the current server nickname and avatar
	 * @returns Promise<BotIdentity | null> - null if identity cannot be resolved
	 */
	private async getServerSpecificIdentity(
		userId: string,
		guildId: string,
		fallbackName: string,
		forceRefresh: boolean = false
	): Promise<BotIdentity | null> {
		try {
			// Import DiscordService dynamically to avoid circular dependencies
			const { container, ServiceId } = await import('@starbunk/shared');
			const discordService = container.get(ServiceId.DiscordService) as any;

			// Get the guild member (server-specific data)
			const member = await discordService.getMemberAsync(guildId, userId);

			if (!member) {
				throw new Error(`Member not found in guild ${guildId}`);
			}

			// Get server-specific nickname (falls back to username)
			const botName = member.nickname || member.user.username || fallbackName;

			// Get server-specific avatar (falls back to global avatar)
			// If no valid avatar is found, return null to indicate failure
			const avatarUrl = member.displayAvatarURL({ size: 256, extension: 'png' }) ||
				member.user.displayAvatarURL({ size: 256, extension: 'png' });

			if (!avatarUrl) {
				throw new Error(`No valid avatar URL found for user ${userId} in guild ${guildId}`);
			}

			logger.debug(`[BotIdentityService] Server-specific identity for ${userId} in ${guildId}: ${botName}`);

			return {
				botName,
				avatarUrl
			};
		} catch (error) {
			logger.error(`Failed to get server-specific identity for ${userId} in ${guildId}:`, error as Error);

			// Try fallback to the old method as last resort
			try {
				return await getBotIdentityFromDiscord({
					userId,
					fallbackName,
					message: undefined, // No message context for fallback
					forceRefresh
				});
			} catch (fallbackError) {
				logger.error(`Fallback identity resolution also failed for ${userId}:`, fallbackError as Error);
				return null; // Complete failure - bot will remain silent
			}
		}
	}

	/**
	 * Get Chad's bot identity with server context
	 * @returns Promise<BotIdentity | null> - null if identity cannot be resolved
	 */
	async getChadIdentity(message?: Message, forceRefresh: boolean = false): Promise<BotIdentity | null> {
		return this.getBotIdentityByUsername('Chad', message, 'ChadBot', forceRefresh);
	}

	/**
	 * Get Guy's bot identity with server context
	 * @returns Promise<BotIdentity | null> - null if identity cannot be resolved
	 */
	async getGuyIdentity(message?: Message, forceRefresh: boolean = false): Promise<BotIdentity | null> {
		return this.getBotIdentityByUsername('Guy', message, 'GuyBot', forceRefresh);
	}

	/**
	 * Get Venn's bot identity with server context
	 * @returns Promise<BotIdentity | null> - null if identity cannot be resolved
	 */
	async getVennIdentity(message?: Message, forceRefresh: boolean = false): Promise<BotIdentity | null> {
		return this.getBotIdentityByUsername('Venn', message, 'VennBot', forceRefresh);
	}

	/**
	 * Get Cova's bot identity with server context
	 * @returns Promise<BotIdentity | null> - null if identity cannot be resolved
	 */
	async getCovaIdentity(message?: Message, forceRefresh: boolean = false): Promise<BotIdentity | null> {
		return this.getBotIdentityByUsername('Cova', message, 'CovaBot', forceRefresh);
	}

	/**
	 * Get cached identity if not expired
	 */
	private getCachedIdentity(cacheKey: string): BotIdentity | null {
		const cached = this.identityCache.get(cacheKey);
		const lastUpdate = this.lastCacheUpdate.get(cacheKey) || 0;

		if (cached && (Date.now() - lastUpdate) < this.cacheExpiry) {
			logger.debug(`[BotIdentityService] Cache hit for ${cacheKey}`);
			return cached;
		}

		// Clean up expired cache entry
		if (cached) {
			this.identityCache.delete(cacheKey);
			this.lastCacheUpdate.delete(cacheKey);
			logger.debug(`[BotIdentityService] Expired cache entry removed for ${cacheKey}`);
		}

		return null;
	}

	/**
	 * Cache identity with optional custom expiry
	 */
	private cacheIdentity(cacheKey: string, identity: BotIdentity, customExpiry?: number): void {
		this.identityCache.set(cacheKey, identity);
		this.lastCacheUpdate.set(cacheKey, Date.now());

		logger.debug(`[BotIdentityService] Cached identity for ${cacheKey}: ${identity.botName}`);

		// Set up cleanup timer
		const expiry = customExpiry || this.cacheExpiry;
		setTimeout(() => {
			this.identityCache.delete(cacheKey);
			this.lastCacheUpdate.delete(cacheKey);
			logger.debug(`[BotIdentityService] Auto-cleaned cache entry for ${cacheKey}`);
		}, expiry);
	}

	/**
	 * Clear all cached identities
	 */
	clearCache(): void {
		this.identityCache.clear();
		this.lastCacheUpdate.clear();
		logger.info('[BotIdentityService] All identity cache cleared');
	}

	/**
	 * Clear cache for a specific user across all servers
	 */
	clearUserCache(userId: string): void {
		const keysToDelete: string[] = [];
		for (const key of this.identityCache.keys()) {
			if (key.includes(`userId:${userId}:`) || key.includes(`username:`) && key.includes(userId)) {
				keysToDelete.push(key);
			}
		}

		keysToDelete.forEach(key => {
			this.identityCache.delete(key);
			this.lastCacheUpdate.delete(key);
		});

		if (keysToDelete.length > 0) {
			logger.info(`[BotIdentityService] Cleared ${keysToDelete.length} cache entries for user ${userId}`);
		}
	}

	/**
	 * Get cache statistics for monitoring
	 */
	getCacheStats(): { size: number; keys: string[] } {
		return {
			size: this.identityCache.size,
			keys: Array.from(this.identityCache.keys())
		};
	}
}
