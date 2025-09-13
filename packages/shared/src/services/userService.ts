import { logger } from './logger';
import { getConfigurationService } from './configuration/configurationService';

export class UserService {
	private static instance: UserService;
	private configService = getConfigurationService();
	private cache = new Map<string, string>();
	private reverseCache = new Map<string, string>();
	private isInitialized = false;

	private constructor() {}

	public static getInstance(): UserService {
		if (!UserService.instance) {
			UserService.instance = new UserService();
		}
		return UserService.instance;
	}

	public async initialize(): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		try {
			logger.info('👥 Initializing User Service...');
			await this.configService.initialize();
			this.isInitialized = true;
			logger.info('✅ User Service initialized successfully');
		} catch (error) {
			logger.error(
				'❌ Failed to initialize User Service:',
				error instanceof Error ? error : new Error(String(error)),
			);
			throw error;
		}
	}

	/**
	 * Get user ID by username
	 */
	public async getUserId(username: string): Promise<string | null> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		// Check cache first
		const cached = this.cache.get(username.toLowerCase());
		if (cached) {
			return cached;
		}

		try {
			const userConfig = await this.configService.getUserByUsername(username);
			if (userConfig) {
				// Cache both directions
				this.cache.set(username.toLowerCase(), userConfig.userId);
				this.reverseCache.set(userConfig.userId, userConfig.username);
				return userConfig.userId;
			}

			return null;
		} catch (error) {
			logger.error(
				`Failed to get user ID for username ${username}:`,
				error instanceof Error ? error : new Error(String(error)),
			);
			return null;
		}
	}

	/**
	 * Get username by user ID
	 */
	public async getUsername(userId: string): Promise<string | null> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		// Check cache first
		const cached = this.reverseCache.get(userId);
		if (cached) {
			return cached;
		}

		try {
			const userConfig = await this.configService.getUserConfiguration(userId);
			if (userConfig) {
				// Cache both directions
				this.cache.set(userConfig.username.toLowerCase(), userConfig.userId);
				this.reverseCache.set(userConfig.userId, userConfig.username);
				return userConfig.username;
			}

			return null;
		} catch (error) {
			logger.error(
				`Failed to get username for user ID ${userId}:`,
				error instanceof Error ? error : new Error(String(error)),
			);
			return null;
		}
	}

	/**
	 * Get user configuration by user ID
	 */
	public async getUserConfig(userId: string) {
		if (!this.isInitialized) {
			await this.initialize();
		}

		try {
			return await this.configService.getUserConfiguration(userId);
		} catch (error) {
			logger.error(
				`Failed to get user config for ${userId}:`,
				error instanceof Error ? error : new Error(String(error)),
			);
			return null;
		}
	}

	/**
	 * Check if user exists
	 */
	public async userExists(userId: string): Promise<boolean> {
		const config = await this.getUserConfig(userId);
		return config !== null && config.isActive;
	}

	/**
	 * Clear cache
	 */
	public clearCache(): void {
		this.cache.clear();
		this.reverseCache.clear();
		logger.info('User service cache cleared');
	}

	/**
	 * Get all known user IDs (for backward compatibility)
	 */
	public async getAllUserIds(): Promise<Record<string, string>> {
		if (!this.isInitialized) {
			await this.initialize();
		}

		const userIds: Record<string, string> = {};

		// Known usernames to look up
		const knownUsernames = [
			'Cova',
			'Venn',
			'Bender',
			'Sig',
			'Guy',
			'Guildus',
			'Deaf',
			'Feli',
			'Goose',
			'Chad',
			'Ian',
		];

		for (const username of knownUsernames) {
			try {
				const userId = await this.getUserId(username);
				if (userId) {
					userIds[username] = userId;
				}
			} catch (error) {
				logger.warn(
					`Failed to get user ID for ${username}:`,
					error instanceof Error ? error : new Error(String(error)),
				);
			}
		}

		return userIds;
	}
}

// Export singleton instance getter
export const getUserService = (): UserService => {
	return UserService.getInstance();
};

// Convenience functions for backward compatibility
export const getUserId = async (username: string): Promise<string | null> => {
	const service = getUserService();
	return service.getUserId(username);
};

export const getUsername = async (userId: string): Promise<string | null> => {
	const service = getUserService();
	return service.getUsername(userId);
};

export const getUserConfig = async (userId: string) => {
	const service = getUserService();
	return service.getUserConfig(userId);
};

// Legacy user IDs object for backward compatibility
export const createUserIdsObject = async (): Promise<Record<string, string>> => {
	const service = getUserService();
	return service.getAllUserIds();
};
