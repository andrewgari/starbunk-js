import { logger } from '../logger';
import { getDatabaseService } from '../database/databaseService';
import { ConfigurationRepository } from '../database/configurationRepository';
import {
	BotConfig,
	UserConfig,
	ServerConfig,
	BotTriggerConfig,
	BotResponseConfig,
	ConfigurationServiceOptions,
} from './types';

// Fallback hardcoded configurations
const FALLBACK_USER_IDS = {
	Cova: '139592376443338752',
	Venn: '151120340343455744',
	Bender: '135820819086573568',
	Sig: '486516247576444928',
	Guy: '113035990725066752',
	Guildus: '113776144012148737',
	Deaf: '115631499344216066',
	Feli: '120263103366692868',
	Goose: '163780525859930112',
	Chad: '85184539906809856',
	Ian: '146110603835080704',
};

export class ConfigurationService {
	private static instance: ConfigurationService;
	private repository: ConfigurationRepository | null = null;
	private isInitialized = false;
	private options: ConfigurationServiceOptions;

	private constructor(options: ConfigurationServiceOptions = {}) {
		this.options = {
			enableCache: true,
			cacheTimeout: 5 * 60 * 1000, // 5 minutes
			fallbackToHardcoded: true,
			...options,
		};
	}

	public static getInstance(options?: ConfigurationServiceOptions): ConfigurationService {
		if (!ConfigurationService.instance) {
			ConfigurationService.instance = new ConfigurationService(options);
		}
		return ConfigurationService.instance;
	}

	public async initialize(): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		try {
			logger.info('🔧 Initializing Configuration Service...');

			const dbService = getDatabaseService();
			if (!dbService.isReady()) {
				await dbService.connect();
			}

			this.repository = new ConfigurationRepository(dbService.getClient());
			this.isInitialized = true;

			logger.info('✅ Configuration Service initialized successfully');
		} catch (error) {
			logger.error(
				'❌ Failed to initialize Configuration Service:',
				error instanceof Error ? error : new Error(String(error)),
			);

			if (this.options.fallbackToHardcoded) {
				logger.warn('⚠️  Falling back to hardcoded configurations');
				this.isInitialized = true; // Allow service to work with fallbacks
			} else {
				throw error;
			}
		}
	}

	public async getBotConfiguration(botName: string): Promise<BotConfig | null> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		try {
			if (this.repository) {
				const config = await this.repository.getBotConfiguration(botName);
				if (config) {
					return this.transformBotConfiguration(config);
				}
			}

			// Fallback to hardcoded configurations
			if (this.options.fallbackToHardcoded) {
				return this.getFallbackBotConfiguration(botName);
			}

			return null;
		} catch (error) {
			logger.error(
				`Failed to get bot configuration for ${botName}:`,
				error instanceof Error ? error : new Error(String(error)),
			);

			if (this.options.fallbackToHardcoded) {
				logger.warn(`Falling back to hardcoded configuration for ${botName}`);
				return this.getFallbackBotConfiguration(botName);
			}

			throw error;
		}
	}

	public async getAllBotConfigurations(): Promise<BotConfig[]> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		try {
			if (this.repository) {
				const configs = await this.repository.getAllBotConfigurations();
				return configs.map((config) => this.transformBotConfiguration(config));
			}

			// Fallback to hardcoded configurations
			if (this.options.fallbackToHardcoded) {
				return this.getFallbackBotConfigurations();
			}

			return [];
		} catch (error) {
			logger.error(
				'Failed to get all bot configurations:',
				error instanceof Error ? error : new Error(String(error)),
			);

			if (this.options.fallbackToHardcoded) {
				logger.warn('Falling back to hardcoded bot configurations');
				return this.getFallbackBotConfigurations();
			}

			throw error;
		}
	}

	public async getUserConfiguration(userId: string): Promise<UserConfig | null> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		try {
			if (this.repository) {
				const config = await this.repository.getUserConfiguration(userId);
				if (config) {
					return {
						userId: config.userId,
						username: config.username,
						displayName: config.displayName,
						isActive: config.isActive,
						metadata: config.metadata,
					};
				}
			}

			// Fallback to hardcoded user IDs
			if (this.options.fallbackToHardcoded) {
				const username = Object.keys(FALLBACK_USER_IDS).find(
					(key) => FALLBACK_USER_IDS[key as keyof typeof FALLBACK_USER_IDS] === userId,
				);

				if (username) {
					return {
						userId,
						username,
						displayName: username,
						isActive: true,
					};
				}
			}

			return null;
		} catch (error) {
			logger.error(
				`Failed to get user configuration for ${userId}:`,
				error instanceof Error ? error : new Error(String(error)),
			);
			throw error;
		}
	}

	public async getUserByUsername(username: string): Promise<UserConfig | null> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		try {
			if (this.repository) {
				const config = await this.repository.getUserByUsername(username);
				if (config) {
					return {
						userId: config.userId,
						username: config.username,
						displayName: config.displayName,
						isActive: config.isActive,
						metadata: config.metadata,
					};
				}
			}

			// Fallback to hardcoded user IDs
			if (this.options.fallbackToHardcoded) {
				const userId = FALLBACK_USER_IDS[username as keyof typeof FALLBACK_USER_IDS];
				if (userId) {
					return {
						userId,
						username,
						displayName: username,
						isActive: true,
					};
				}
			}

			return null;
		} catch (error) {
			logger.error(
				`Failed to get user configuration for username ${username}:`,
				error instanceof Error ? error : new Error(String(error)),
			);
			throw error;
		}
	}

	public async getServerConfiguration(serverId: string): Promise<ServerConfig | null> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		try {
			if (this.repository) {
				const config = await this.repository.getServerConfiguration(serverId);
				if (config) {
					return {
						serverId: config.serverId,
						serverName: config.serverName,
						isActive: config.isActive,
						settings: config.settings,
					};
				}
			}

			return null;
		} catch (error) {
			logger.error(
				`Failed to get server configuration for ${serverId}:`,
				error instanceof Error ? error : new Error(String(error)),
			);
			throw error;
		}
	}

	public clearCache(): void {
		if (this.repository) {
			this.repository.clearCache();
		}
	}

	private transformBotConfiguration(config: any): BotConfig {
		return {
			botName: config.botName,
			displayName: config.displayName,
			description: config.description,
			isEnabled: config.isEnabled,
			avatarUrl: config.avatarUrl,
			priority: config.priority,
			triggers: config.patterns.map(
				(pattern: any): BotTriggerConfig => ({
					name: pattern.name,
					pattern: new RegExp(pattern.pattern, pattern.patternFlags || ''),
					priority: pattern.priority,
					isEnabled: pattern.isEnabled,
					description: pattern.description,
				}),
			),
			responses: config.responses.map(
				(response: any): BotResponseConfig => ({
					name: response.name,
					type: response.responseType,
					content: response.content,
					alternatives: response.alternatives,
					priority: response.priority,
					isEnabled: response.isEnabled,
					metadata: response.metadata,
				}),
			),
			metadata: config.metadata,
		};
	}

	private getFallbackBotConfiguration(botName: string): BotConfig | null {
		// Hardcoded fallback configurations
		switch (botName) {
			case 'nice-bot':
				return {
					botName: 'nice-bot',
					displayName: 'Nice Bot',
					description: 'Responds with "Nice." to specific numbers',
					isEnabled: true,
					avatarUrl: 'https://pbs.twimg.com/profile_images/421461637325787136/0rxpHzVx.jpeg',
					priority: 1,
					triggers: [
						{
							name: 'default',
							pattern: /\b69|(sixty-?nine)\b/i,
							priority: 1,
							isEnabled: true,
							description: 'Matches 69 or sixty-nine',
						},
					],
					responses: [
						{
							name: 'default',
							type: 'static',
							content: 'Nice.',
							priority: 1,
							isEnabled: true,
						},
					],
				};
			default:
				return null;
		}
	}

	private getFallbackBotConfigurations(): BotConfig[] {
		return [this.getFallbackBotConfiguration('nice-bot')].filter(Boolean) as BotConfig[];
	}
}

// Export singleton instance getter
export const getConfigurationService = (options?: ConfigurationServiceOptions): ConfigurationService => {
	return ConfigurationService.getInstance(options);
};
