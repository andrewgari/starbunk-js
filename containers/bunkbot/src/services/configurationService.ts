// Use the shared database service instead of direct Prisma import
import { getDatabaseService } from '@starbunk/shared';
import { logger } from '@starbunk/shared';

export interface UserConfig {
	userId: string;
	username: string;
	displayName?: string;
	isActive: boolean;
}

export interface BotConfig {
	botName: string;
	displayName: string;
	description?: string;
	isEnabled: boolean;
	avatarUrl?: string;
	priority: number;
	metadata?: any;
}

export interface ServerConfig {
	serverId: string;
	serverName: string;
	isActive: boolean;
	settings?: any;
}

/**
 * Centralized configuration service for Discord IDs and bot settings
 * Replaces hardcoded values with database-driven configuration
 */
export class ConfigurationService {
	private prisma: any;
	private userCache = new Map<string, UserConfig>();
	private botCache = new Map<string, BotConfig>();
	private serverCache = new Map<string, ServerConfig>();
	private cacheExpiry = 5 * 60 * 1000; // 5 minutes
	private lastCacheUpdate = 0;

	constructor(prisma?: any) {
		this.prisma = prisma || getDatabaseService();
	}

	/**
	 * Get user configuration by Discord user ID
	 */
	async getUserConfig(userId: string): Promise<UserConfig | null> {
		await this.refreshCacheIfNeeded();
		
		const cached = this.userCache.get(userId);
		if (cached) {
			return cached;
		}

		try {
			const user = await this.prisma.userConfiguration.findUnique({
				where: { userId }
			});

			if (user) {
				const config: UserConfig = {
					userId: user.userId,
					username: user.username,
					displayName: user.displayName || undefined,
					isActive: user.isActive
				};
				this.userCache.set(userId, config);
				return config;
			}
		} catch (error) {
			logger.error(`Failed to fetch user config for ${userId}:`, error as Error);
		}

		return null;
	}

	/**
	 * Get user ID by username (case-insensitive)
	 */
	async getUserIdByUsername(username: string): Promise<string | null> {
		await this.refreshCacheIfNeeded();

		// Search cache first
		for (const [userId, config] of this.userCache.entries()) {
			if (config.username.toLowerCase() === username.toLowerCase()) {
				return userId;
			}
		}

		try {
			const user = await this.prisma.userConfiguration.findFirst({
				where: {
					username: {
						equals: username,
						mode: 'insensitive'
					}
				}
			});

			if (user) {
				// Cache the result
				const config: UserConfig = {
					userId: user.userId,
					username: user.username,
					displayName: user.displayName || undefined,
					isActive: user.isActive
				};
				this.userCache.set(user.userId, config);
				return user.userId;
			}
		} catch (error) {
			logger.error(`Failed to fetch user ID for username ${username}:`, error as Error);
		}

		return null;
	}

	/**
	 * Get bot configuration by bot name
	 */
	async getBotConfig(botName: string): Promise<BotConfig | null> {
		await this.refreshCacheIfNeeded();
		
		const cached = this.botCache.get(botName);
		if (cached) {
			return cached;
		}

		try {
			const bot = await this.prisma.botConfiguration.findUnique({
				where: { botName }
			});

			if (bot) {
				const config: BotConfig = {
					botName: bot.botName,
					displayName: bot.displayName,
					description: bot.description || undefined,
					isEnabled: bot.isEnabled,
					avatarUrl: bot.avatarUrl || undefined,
					priority: bot.priority,
					metadata: bot.metadata || undefined
				};
				this.botCache.set(botName, config);
				return config;
			}
		} catch (error) {
			logger.error(`Failed to fetch bot config for ${botName}:`, error as Error);
		}

		return null;
	}

	/**
	 * Get server configuration by Discord server ID
	 */
	async getServerConfig(serverId: string): Promise<ServerConfig | null> {
		await this.refreshCacheIfNeeded();
		
		const cached = this.serverCache.get(serverId);
		if (cached) {
			return cached;
		}

		try {
			const server = await this.prisma.serverConfiguration.findUnique({
				where: { serverId }
			});

			if (server) {
				const config: ServerConfig = {
					serverId: server.serverId,
					serverName: server.serverName,
					isActive: server.isActive,
					settings: server.settings || undefined
				};
				this.serverCache.set(serverId, config);
				return config;
			}
		} catch (error) {
			logger.error(`Failed to fetch server config for ${serverId}:`, error as Error);
		}

		return null;
	}

	/**
	 * Refresh cache if it's expired
	 */
	private async refreshCacheIfNeeded(): Promise<void> {
		const now = Date.now();
		if (now - this.lastCacheUpdate > this.cacheExpiry) {
			await this.refreshCache();
		}
	}

	/**
	 * Force refresh all caches
	 */
	async refreshCache(): Promise<void> {
		try {
			logger.debug('Refreshing configuration cache...');
			
			// Clear existing caches
			this.userCache.clear();
			this.botCache.clear();
			this.serverCache.clear();

			// Preload active users
			const users = await this.prisma.userConfiguration.findMany({
				where: { isActive: true }
			});
			
			for (const user of users) {
				this.userCache.set(user.userId, {
					userId: user.userId,
					username: user.username,
					displayName: user.displayName || undefined,
					isActive: user.isActive
				});
			}

			// Preload enabled bots
			const bots = await this.prisma.botConfiguration.findMany({
				where: { isEnabled: true }
			});
			
			for (const bot of bots) {
				this.botCache.set(bot.botName, {
					botName: bot.botName,
					displayName: bot.displayName,
					description: bot.description || undefined,
					isEnabled: bot.isEnabled,
					avatarUrl: bot.avatarUrl || undefined,
					priority: bot.priority,
					metadata: bot.metadata || undefined
				});
			}

			// Preload active servers
			const servers = await this.prisma.serverConfiguration.findMany({
				where: { isActive: true }
			});
			
			for (const server of servers) {
				this.serverCache.set(server.serverId, {
					serverId: server.serverId,
					serverName: server.serverName,
					isActive: server.isActive,
					settings: server.settings || undefined
				});
			}

			this.lastCacheUpdate = Date.now();
			logger.debug(`Configuration cache refreshed: ${users.length} users, ${bots.length} bots, ${servers.length} servers`);
		} catch (error) {
			logger.error('Failed to refresh configuration cache:', error as Error);
		}
	}

	/**
	 * Disconnect from database
	 */
	async disconnect(): Promise<void> {
		await this.prisma.$disconnect();
	}
}
