import { logger } from '@starbunk/shared';
import { Client, Events } from 'discord.js';
import { CommandHandler } from '../command-handler';
import { DJCova } from './dj-cova';
import { validateEnvironment, container, ServiceId } from '../utils';
import { createDiscordClient, loginToDiscord } from './discord-client-factory';
import { setupDiscordEventHandlers } from './event-handlers';

/**
 * Main container for DJCova - orchestrates initialization and lifecycle
 */
export class DJCovaContainer {
	private client!: Client;
	private commandHandler!: CommandHandler;
	private musicPlayer!: DJCova;
	private hasInitialized = false;

	async initialize(): Promise<void> {
		logger.info('🎵 Initializing DJCova container...');

		try {
			// Setup logging
			logger.setServiceName('djcova');
			logger.enableStructuredLogging(true);
			logger.info('✅ Observability initialized for DJCova');

			// Validate environment
			this.validateEnvironment();

			// Create Discord client
			this.client = createDiscordClient();

			// Initialize services
			await this.initializeServices();

			// Setup event handlers
			setupDiscordEventHandlers(this.client, this.commandHandler, () => {
				this.hasInitialized = true;
			});

			logger.info('✅ DJCova container initialized successfully');
		} catch (error) {
			logger.error('❌ Failed to initialize DJCova container:', error);
			throw error;
		}
	}

	private validateEnvironment(): void {
		validateEnvironment({
			required: ['DISCORD_TOKEN', 'CLIENT_ID'],
			optional: ['DEBUG_MODE', 'TESTING_SERVER_IDS', 'TESTING_CHANNEL_IDS', 'NODE_ENV', 'MUSIC_IDLE_TIMEOUT_SECONDS'],
		});
	}

	private async initializeServices(): Promise<void> {
		// Register Discord client
		container.register(ServiceId.DiscordClient, this.client);

		// Initialize music player
		this.musicPlayer = new DJCova();
		container.register(ServiceId.MusicPlayer, this.musicPlayer);

		// Initialize service layer
		const { DJCovaService } = await import('../services/dj-cova-service');
		const djCovaService = new DJCovaService(this.musicPlayer);
		container.register(ServiceId.DJCovaService, djCovaService);

		// Initialize command handler
		this.commandHandler = new CommandHandler();
		await this.commandHandler.registerCommands();

		logger.info('DJCova services initialized');
	}

	async start(): Promise<void> {
		const token = process.env.DISCORD_TOKEN;
		if (!token) {
			throw new Error('DISCORD_TOKEN environment variable is required');
		}

		// Login to Discord with retry logic
		await loginToDiscord(this.client, token);

		// Wait for ready event
		await this.waitForReady();

		logger.info('🎉 DJCova started successfully');
	}

	private waitForReady(): Promise<void> {
		return new Promise((resolve) => {
			if (this.hasInitialized) {
				resolve();
			} else {
				this.client.once(Events.ClientReady, () => resolve());
			}
		});
	}

	async stop(): Promise<void> {
		logger.info('Stopping DJCova...');

		if (this.musicPlayer) {
			this.musicPlayer.destroy();
		}

		if (this.client) {
			await this.client.destroy();
		}

		logger.info('DJCova stopped');
	}
}

