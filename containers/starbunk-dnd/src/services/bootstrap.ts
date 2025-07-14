// Bootstrap service for starbunk-dnd container
import { logger, getDiscordService } from '@starbunk/shared';

export interface BootstrapConfig {
	enableSnowbunk: boolean;
	enableDndFeatures: boolean;
}

export class BootstrapService {
	private config: BootstrapConfig;

	constructor(config: BootstrapConfig = { enableSnowbunk: true, enableDndFeatures: true }) {
		this.config = config;
	}

	async initialize(): Promise<void> {
		logger.info('Initializing Starbunk-DND container...');

		try {
			// Initialize Discord service
			const discordService = getDiscordService();
			if (!discordService) {
				throw new Error('Discord service not available');
			}

			if (this.config.enableSnowbunk) {
				logger.info('Snowbunk bridge enabled');
			}

			if (this.config.enableDndFeatures) {
				logger.info('D&D features enabled');
			}

			logger.info('Starbunk-DND container initialized successfully');
		} catch (error) {
			logger.error('Failed to initialize Starbunk-DND container', error as Error);
			throw error;
		}
	}

	getConfig(): BootstrapConfig {
		return { ...this.config };
	}

	updateConfig(newConfig: Partial<BootstrapConfig>): void {
		this.config = { ...this.config, ...newConfig };
		logger.info('Bootstrap configuration updated', this.config);
	}
}

// Default export for compatibility
export default BootstrapService;
