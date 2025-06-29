// CovaBot - AI personality bot container
import { Events, Message } from 'discord.js';
import {
	logger,
	ensureError,
	validateEnvironment,
	createDiscordClient,
	ClientConfigs,
	container,
	ServiceId,
	WebhookManager,
	getMessageFilter,
	MessageFilter
} from '@starbunk/shared';

class CovaBotContainer {
	private client: any;
	private webhookManager: WebhookManager;
	private messageFilter: MessageFilter;
	private hasInitialized = false;

	async initialize(): Promise<void> {
		logger.info('🤖 Initializing CovaBot container...');

		try {
			// Validate environment
			this.validateEnvironment();

			// Create Discord client
			this.client = createDiscordClient(ClientConfigs.CovaBot);

			// Initialize services
			await this.initializeServices();

			// Set up event handlers
			this.setupEventHandlers();

			logger.info('✅ CovaBot container initialized successfully');
		} catch (error) {
			logger.error('❌ Failed to initialize CovaBot container:', ensureError(error));
			throw error;
		}
	}

	private validateEnvironment(): void {
		validateEnvironment({
			required: ['STARBUNK_TOKEN'],
			optional: ['DATABASE_URL', 'OPENAI_API_KEY', 'OLLAMA_API_URL', 'DEBUG_MODE', 'TESTING_SERVER_IDS', 'TESTING_CHANNEL_IDS', 'NODE_ENV']
		});
	}

	private async initializeServices(): Promise<void> {
		// Register Discord client
		container.register(ServiceId.DiscordClient, this.client);

		// Initialize webhook manager for AI personality responses
		this.webhookManager = new WebhookManager(this.client);
		container.register(ServiceId.WebhookService, this.webhookManager);

		// Initialize message filter
		this.messageFilter = getMessageFilter();
		container.register(ServiceId.MessageFilter, this.messageFilter);

		// Initialize minimal database access for personality data
		if (process.env.DATABASE_URL) {
			// TODO: Initialize Prisma client for personality data
			logger.info('Database connection available for personality data');
		}

		// Initialize LLM services for AI personality
		if (process.env.OPENAI_API_KEY || process.env.OLLAMA_API_URL) {
			// TODO: Initialize LLM manager
			logger.info('LLM services available for AI personality');
		}

		logger.info('CovaBot services initialized');
	}

	private setupEventHandlers(): void {
		this.client.on(Events.Error, (error: Error) => {
			logger.error('Discord client error:', error);
		});

		this.client.on(Events.Warn, (warning: string) => {
			logger.warn('Discord client warning:', warning);
		});

		this.client.on(Events.MessageCreate, async (message: Message) => {
			await this.handleMessage(message);
		});

		this.client.once(Events.ClientReady, () => {
			logger.info('🤖 CovaBot is ready and connected to Discord');
			this.hasInitialized = true;
		});
	}

	private async handleMessage(message: Message): Promise<void> {
		// Skip bot messages
		if (message.author.bot) return;

		try {
			// Create message context for filtering
			const context = MessageFilter.createContextFromMessage(message);

			// Check if message should be processed
			const filterResult = this.messageFilter.shouldProcessMessage(context);
			if (!filterResult.allowed) {
				// Message was filtered out - no need to log unless in debug mode
				if (this.messageFilter.isDebugMode()) {
					logger.debug(`AI message filtered: ${filterResult.reason}`);
				}
				return;
			}

			// TODO: Process message with AI Cova personality
			// This will be implemented when we fix the AI Cova imports
			logger.debug(`Processing AI message from ${message.author.username}: ${message.content}`);
		} catch (error) {
			logger.error('Error in CovaBot message handling:', ensureError(error));
		}
	}

	async start(): Promise<void> {
		const token = process.env.STARBUNK_TOKEN;
		if (!token) {
			throw new Error('STARBUNK_TOKEN environment variable is required');
		}

		await this.client.login(token);
		await this.waitForReady();
		logger.info('🎉 CovaBot started successfully');
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
		logger.info('Stopping CovaBot...');
		if (this.client) {
			await this.client.destroy();
		}
		logger.info('CovaBot stopped');
	}
}

// Main execution
async function main(): Promise<void> {
	try {
		const covaBot = new CovaBotContainer();
		await covaBot.initialize();
		await covaBot.start();
	} catch (error) {
		logger.error('Failed to start CovaBot:', ensureError(error));
		process.exit(1);
	}
}

// Graceful shutdown
process.on('SIGINT', async () => {
	logger.info('Received SIGINT signal, shutting down CovaBot...');
	process.exit(0);
});

process.on('SIGTERM', async () => {
	logger.info('Received SIGTERM signal, shutting down CovaBot...');
	process.exit(0);
});

if (require.main === module) {
	main().catch(error => {
		console.error('Fatal error:', ensureError(error));
		process.exit(1);
	});
}
