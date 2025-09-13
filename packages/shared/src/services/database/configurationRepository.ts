import { PrismaClient } from '@prisma/client';
import { logger } from '../logger';
import { BotConfigurationData, UserConfigurationData, ServerConfigurationData } from './types';

export class ConfigurationRepository {
	private prisma: PrismaClient;
	private cache = new Map<string, any>();
	private cacheExpiry = new Map<string, number>();
	private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

	constructor(prisma: PrismaClient) {
		this.prisma = prisma;
	}

	// Cache management
	private getCacheKey(type: string, key: string): string {
		return `${type}:${key}`;
	}

	private isExpired(key: string): boolean {
		const expiry = this.cacheExpiry.get(key);
		return !expiry || Date.now() > expiry;
	}

	private setCache<T>(key: string, value: T): void {
		this.cache.set(key, value);
		this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
	}

	private getCache<T>(key: string): T | null {
		if (this.isExpired(key)) {
			this.cache.delete(key);
			this.cacheExpiry.delete(key);
			return null;
		}
		return this.cache.get(key) || null;
	}

	public clearCache(): void {
		this.cache.clear();
		this.cacheExpiry.clear();
		logger.info('Configuration cache cleared');
	}

	// Bot Configuration methods
	public async getBotConfiguration(botName: string): Promise<BotConfigurationData | null> {
		const cacheKey = this.getCacheKey('bot', botName);
		const cached = this.getCache<BotConfigurationData>(cacheKey);
		if (cached) {
			return cached;
		}

		try {
			const config = await this.prisma.botConfiguration.findUnique({
				where: { botName },
				include: {
					patterns: {
						where: { isEnabled: true },
						orderBy: { priority: 'desc' },
					},
					responses: {
						where: { isEnabled: true },
						orderBy: { priority: 'desc' },
					},
				},
			});

			if (!config) {
				return null;
			}

			const result: BotConfigurationData = {
				id: config.id,
				botName: config.botName,
				displayName: config.displayName,
				description: config.description || undefined,
				isEnabled: config.isEnabled,
				avatarUrl: config.avatarUrl || undefined,
				priority: config.priority,
				metadata: config.metadata,
				patterns: config.patterns.map((p: any) => ({
					id: p.id,
					name: p.name,
					pattern: p.pattern,
					patternFlags: p.patternFlags || undefined,
					isEnabled: p.isEnabled,
					priority: p.priority,
					description: p.description || undefined,
				})),
				responses: config.responses.map((r: any) => ({
					id: r.id,
					name: r.name,
					responseType: r.responseType as 'static' | 'random' | 'llm' | 'function',
					content: r.content || undefined,
					alternatives: (r.alternatives as string[]) || undefined,
					isEnabled: r.isEnabled,
					priority: r.priority,
					metadata: r.metadata,
				})),
			};

			this.setCache(cacheKey, result);
			return result;
		} catch (error) {
			logger.error(
				`Failed to get bot configuration for ${botName}:`,
				error instanceof Error ? error : new Error(String(error)),
			);
			throw error;
		}
	}

	public async getAllBotConfigurations(): Promise<BotConfigurationData[]> {
		const cacheKey = this.getCacheKey('bots', 'all');
		const cached = this.getCache<BotConfigurationData[]>(cacheKey);
		if (cached) {
			return cached;
		}

		try {
			const configs = await this.prisma.botConfiguration.findMany({
				where: { isEnabled: true },
				include: {
					patterns: {
						where: { isEnabled: true },
						orderBy: { priority: 'desc' },
					},
					responses: {
						where: { isEnabled: true },
						orderBy: { priority: 'desc' },
					},
				},
				orderBy: { priority: 'desc' },
			});

			const result = configs.map((config: any) => ({
				id: config.id,
				botName: config.botName,
				displayName: config.displayName,
				description: config.description || undefined,
				isEnabled: config.isEnabled,
				avatarUrl: config.avatarUrl || undefined,
				priority: config.priority,
				metadata: config.metadata,
				patterns: config.patterns.map((p: any) => ({
					id: p.id,
					name: p.name,
					pattern: p.pattern,
					patternFlags: p.patternFlags || undefined,
					isEnabled: p.isEnabled,
					priority: p.priority,
					description: p.description || undefined,
				})),
				responses: config.responses.map((r: any) => ({
					id: r.id,
					name: r.name,
					responseType: r.responseType as 'static' | 'random' | 'llm' | 'function',
					content: r.content || undefined,
					alternatives: (r.alternatives as string[]) || undefined,
					isEnabled: r.isEnabled,
					priority: r.priority,
					metadata: r.metadata,
				})),
			}));

			this.setCache(cacheKey, result);
			return result;
		} catch (error) {
			logger.error(
				'Failed to get all bot configurations:',
				error instanceof Error ? error : new Error(String(error)),
			);
			throw error;
		}
	}

	// User Configuration methods
	public async getUserConfiguration(userId: string): Promise<UserConfigurationData | null> {
		const cacheKey = this.getCacheKey('user', userId);
		const cached = this.getCache<UserConfigurationData>(cacheKey);
		if (cached) {
			return cached;
		}

		try {
			const config = await this.prisma.userConfiguration.findUnique({
				where: { userId },
			});

			if (!config) {
				return null;
			}

			const result: UserConfigurationData = {
				id: config.id,
				userId: config.userId,
				username: config.username,
				displayName: config.displayName || undefined,
				isActive: config.isActive,
				metadata: config.metadata,
			};

			this.setCache(cacheKey, result);
			return result;
		} catch (error) {
			logger.error(
				`Failed to get user configuration for ${userId}:`,
				error instanceof Error ? error : new Error(String(error)),
			);
			throw error;
		}
	}

	public async getUserByUsername(username: string): Promise<UserConfigurationData | null> {
		try {
			const config = await this.prisma.userConfiguration.findFirst({
				where: {
					username: {
						equals: username,
						mode: 'insensitive',
					},
				},
			});

			if (!config) {
				return null;
			}

			return {
				id: config.id,
				userId: config.userId,
				username: config.username,
				displayName: config.displayName || undefined,
				isActive: config.isActive,
				metadata: config.metadata,
			};
		} catch (error) {
			logger.error(
				`Failed to get user configuration for username ${username}:`,
				error instanceof Error ? error : new Error(String(error)),
			);
			throw error;
		}
	}

	// Server Configuration methods
	public async getServerConfiguration(serverId: string): Promise<ServerConfigurationData | null> {
		const cacheKey = this.getCacheKey('server', serverId);
		const cached = this.getCache<ServerConfigurationData>(cacheKey);
		if (cached) {
			return cached;
		}

		try {
			const config = await this.prisma.serverConfiguration.findUnique({
				where: { serverId },
			});

			if (!config) {
				return null;
			}

			const result: ServerConfigurationData = {
				id: config.id,
				serverId: config.serverId,
				serverName: config.serverName,
				isActive: config.isActive,
				settings: config.settings,
			};

			this.setCache(cacheKey, result);
			return result;
		} catch (error) {
			logger.error(
				`Failed to get server configuration for ${serverId}:`,
				error instanceof Error ? error : new Error(String(error)),
			);
			throw error;
		}
	}
}
