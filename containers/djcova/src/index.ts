// DJCova - Music service container
import { Events, Client } from 'discord.js';
import { PlayerSubscription } from '@discordjs/voice';
import {
	logger,
	ensureError,
	validateEnvironment,
	createDiscordClient,
	ClientConfigs,
	container,
	ServiceId,
	getMessageFilter,
	MessageFilter,
	initializeObservability
} from '@starbunk/shared';
import { CommandHandler } from './commandHandler';
import { DJCova } from './djCova';

class DJCovaContainer {
	private client!: Client;
	private messageFilter!: MessageFilter;
	private commandHandler!: CommandHandler;
	private musicPlayer!: DJCova;
	public activeSubscription: PlayerSubscription | null = null;
	private hasInitialized = false;

	async initialize(): Promise<void> {
		logger.info('🎵 Initializing DJCova container...');

		try {
			// Initialize observability first
			const { metrics, logger: structuredLogger, channelTracker } = initializeObservability('djcova');
			logger.info('✅ Observability initialized for DJCova');

			// Validate environment
			this.validateEnvironment();

			// Create Discord client with voice capabilities
			this.client = createDiscordClient(ClientConfigs.DJCova);

			// Initialize services
			await this.initializeServices();

			// Set up event handlers
			this.setupEventHandlers();

			logger.info('✅ DJCova container initialized successfully');
		} catch (error) {
			logger.error('❌ Failed to initialize DJCova container:', ensureError(error));
			throw error;
		}
	}

	private validateEnvironment(): void {
		validateEnvironment({
			required: ['STARBUNK_TOKEN', 'CLIENT_ID'],
			optional: ['DEBUG_MODE', 'TESTING_SERVER_IDS', 'TESTING_CHANNEL_IDS', 'NODE_ENV', 'MUSIC_IDLE_TIMEOUT_SECONDS']
		});
	}

	private async initializeServices(): Promise<void> {
		// Register Discord client
		container.register(ServiceId.DiscordClient, this.client);

		// Initialize message filter
		this.messageFilter = getMessageFilter();
		container.register(ServiceId.MessageFilter, this.messageFilter);

		// Initialize music player
		this.musicPlayer = new DJCova();
		container.register(ServiceId.MusicPlayer, this.musicPlayer);

		// Initialize command handler
		this.commandHandler = new CommandHandler();
		await this.commandHandler.registerCommands();

		// Note: DJCova doesn't need database access
		logger.info('DJCova services initialized (no database required)');
	}

	private setupEventHandlers(): void {
		this.client.on(Events.Error, (error: Error) => {
			logger.error('Discord client error:', error);
		});

		this.client.on(Events.Warn, (warning: string) => {
			logger.warn('Discord client warning:', warning);
		});

		this.client.on(Events.InteractionCreate, async (interaction: any) => {
			await this.handleInteraction(interaction);
		});

		this.client.once(Events.ClientReady, () => {
			logger.info('🎵 DJCova is ready and connected to Discord');
			this.hasInitialized = true;
		});
	}

	private async handleInteraction(interaction: any): Promise<void> {
		if (interaction.isChatInputCommand()) {
			try {
				// Create interaction context for filtering
				const context = MessageFilter.createContextFromInteraction(interaction);

				// Check if interaction should be processed
				const filterResult = this.messageFilter.shouldProcessMessage(context);
				if (!filterResult.allowed) {
					// Interaction was filtered out - send ephemeral response
					if (this.messageFilter.isDebugMode()) {
						await interaction.reply({
							content: `🚫 Music command filtered: ${filterResult.reason}`,
							ephemeral: true
						});
					} else {
						// Silently ignore in production mode
						await interaction.reply({
							content: '🚫 Music commands are not available in this server/channel.',
							ephemeral: true
						});
					}
					return;
				}

				// Handle music commands using the command handler
				await this.commandHandler.handleInteraction(interaction);
			} catch (error) {
				logger.error('Error processing music interaction:', ensureError(error));
			}
		}
	}

	async start(): Promise<void> {
		const token = process.env.STARBUNK_TOKEN;
		if (!token) {
			throw new Error('STARBUNK_TOKEN environment variable is required');
		}

		await this.client.login(token);
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
		if (this.activeSubscription) {
			this.activeSubscription.unsubscribe();
		}
		if (this.client) {
			await this.client.destroy();
		}
		logger.info('DJCova stopped');
	}

}

// Main execution
async function main(): Promise<void> {
	try {
		const djCova = new DJCovaContainer();
		await djCova.initialize();
		await djCova.start();
	} catch (error) {
		logger.error('Failed to start DJCova:', ensureError(error));
		process.exit(1);
	}
}

// Graceful shutdown
process.on('SIGINT', async () => {
	logger.info('Received SIGINT signal, shutting down DJCova...');
	process.exit(0);
});

process.on('SIGTERM', async () => {
	logger.info('Received SIGTERM signal, shutting down DJCova...');
	process.exit(0);
});

if (require.main === module) {
	main().catch(error => {
		console.error('Fatal error:', ensureError(error));
		process.exit(1);
	});
}
