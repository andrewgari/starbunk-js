// Starbunk-DND - D&D features and Snowbunk bridge container
import { Events } from 'discord.js';
import {
	logger,
	ensureError,
	validateEnvironment,
	createDiscordClient,
	ClientConfigs,
	container,
	ServiceId,
	getMessageFilter,
	MessageFilter
} from '@starbunk/shared';

class StarbunkDNDContainer {
	private client: any;
	private messageFilter: MessageFilter;
	private snowbunkClient: any = null;
	private hasInitialized = false;

	async initialize(): Promise<void> {
		logger.info('🐉 Initializing Starbunk-DND container...');

		try {
			// Validate environment
			this.validateEnvironment();

			// Create Discord client
			this.client = createDiscordClient(ClientConfigs.StarbunkDND);

			// Initialize services
			await this.initializeServices();

			// Initialize Snowbunk bridge if token is available
			await this.initializeSnowbunk();

			// Set up event handlers
			this.setupEventHandlers();

			logger.info('✅ Starbunk-DND container initialized successfully');
		} catch (error) {
			logger.error('❌ Failed to initialize Starbunk-DND container:', ensureError(error));
			throw error;
		}
	}

	private validateEnvironment(): void {
		validateEnvironment({
			required: ['STARBUNK_TOKEN'],
			optional: ['SNOWBUNK_TOKEN', 'DATABASE_URL', 'OPENAI_API_KEY', 'OLLAMA_API_URL', 'VECTOR_CONTEXT_DIR', 'DEBUG_MODE', 'TESTING_SERVER_IDS', 'TESTING_CHANNEL_IDS', 'NODE_ENV']
		});
	}

	private async initializeServices(): Promise<void> {
		// Register Discord client
		container.register(ServiceId.DiscordClient, this.client);

		// Initialize message filter
		this.messageFilter = getMessageFilter();
		container.register(ServiceId.MessageFilter, this.messageFilter);

		// Initialize database for D&D campaigns
		if (process.env.DATABASE_URL) {
			// TODO: Initialize Prisma client for campaign data
			logger.info('Database connection available for D&D campaigns');
		}

		// Initialize LLM services if API keys are available
		if (process.env.OPENAI_API_KEY || process.env.OLLAMA_API_URL) {
			// TODO: Initialize LLM manager
			logger.info('LLM services available for D&D features');
		}

		logger.info('Starbunk-DND services initialized');
	}

	private async initializeSnowbunk(): Promise<void> {
		const snowbunkToken = process.env.SNOWBUNK_TOKEN;
		if (snowbunkToken) {
			logger.info('Initializing Snowbunk bridge...');
			try {
				// TODO: Initialize Snowbunk client when we fix the imports
				// this.snowbunkClient = new SnowbunkClient();
				// await this.snowbunkClient.login(snowbunkToken);
				logger.info('Snowbunk bridge will be initialized when imports are fixed');
			} catch (error) {
				logger.error('Failed to initialize Snowbunk bridge:', ensureError(error));
			}
		} else {
			logger.info('SNOWBUNK_TOKEN not provided, skipping bridge initialization');
		}
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
			logger.info('🐉 Starbunk-DND is ready and connected to Discord');
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
							content: `🚫 D&D command filtered: ${filterResult.reason}`,
							ephemeral: true
						});
					} else {
						// Silently ignore in production mode
						await interaction.reply({
							content: '🚫 D&D commands are not available in this server/channel.',
							ephemeral: true
						});
					}
					return;
				}

				// TODO: Handle D&D commands
				// This will be implemented when we fix the command handler
				logger.debug(`Processing D&D command: ${interaction.commandName}`);
			} catch (error) {
				logger.error('Error processing D&D interaction:', ensureError(error));
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
		logger.info('🎉 Starbunk-DND started successfully');
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
		logger.info('Stopping Starbunk-DND...');
		if (this.snowbunkClient) {
			await this.snowbunkClient.destroy();
		}
		if (this.client) {
			await this.client.destroy();
		}
		logger.info('Starbunk-DND stopped');
	}
}

// Main execution
async function main(): Promise<void> {
	try {
		const starbunkDND = new StarbunkDNDContainer();
		await starbunkDND.initialize();
		await starbunkDND.start();
	} catch (error) {
		logger.error('Failed to start Starbunk-DND:', ensureError(error));
		process.exit(1);
	}
}

// Graceful shutdown
process.on('SIGINT', async () => {
	logger.info('Received SIGINT signal, shutting down Starbunk-DND...');
	process.exit(0);
});

process.on('SIGTERM', async () => {
	logger.info('Received SIGTERM signal, shutting down Starbunk-DND...');
	process.exit(0);
});

if (require.main === module) {
	main().catch(error => {
		console.error('Fatal error:', ensureError(error));
		process.exit(1);
	});
}
