// BunkBot - Reply bots and admin commands container
import { Events } from 'discord.js';
import {
	logger,
	container,
	ServiceId,
	ensureError,
	validateEnvironment,
	createDiscordClient,
	ClientConfigs,
	WebhookManager
} from '@starbunk/shared';

class BunkBotContainer {
	private client: any;
	private webhookManager: WebhookManager;
	private hasInitialized = false;

	async initialize(): Promise<void> {
		logger.info('🚀 Initializing BunkBot container...');

		try {
			// Validate environment
			this.validateEnvironment();

			// Create Discord client
			this.client = createDiscordClient(ClientConfigs.BunkBot);

			// Initialize services
			await this.initializeServices();

			// Set up event handlers
			this.setupEventHandlers();

			logger.info('✅ BunkBot container initialized successfully');
		} catch (error) {
			logger.error('❌ Failed to initialize BunkBot container:', ensureError(error));
			throw error;
		}
	}

	private validateEnvironment(): void {
		validateEnvironment({
			required: ['STARBUNK_TOKEN'],
			optional: ['DATABASE_URL', 'DEBUG', 'NODE_ENV']
		});
	}

	private async initializeServices(): Promise<void> {
		// Register Discord client
		container.register(ServiceId.DiscordClient, this.client);

		// Initialize webhook manager
		this.webhookManager = new WebhookManager(this.client);
		container.register(ServiceId.WebhookService, this.webhookManager);

		// Initialize database if URL is provided
		if (process.env.DATABASE_URL) {
			// TODO: Initialize Prisma client for reply bot data
			logger.info('Database connection available for reply bot data');
		}

		logger.info('BunkBot services initialized');
	}

	private setupEventHandlers(): void {
		this.client.on(Events.Error, (error: Error) => {
			logger.error('Discord client error:', error);
		});

		this.client.on(Events.Warn, (warning: string) => {
			logger.warn('Discord client warning:', warning);
		});

		this.client.on(Events.MessageCreate, async (message: any) => {
			await this.handleMessage(message);
		});

		this.client.on(Events.InteractionCreate, async (interaction: any) => {
			await this.handleInteraction(interaction);
		});

		this.client.once(Events.ClientReady, () => {
			logger.info('🤖 BunkBot is ready and connected to Discord');
			this.hasInitialized = true;
		});
	}

	private async handleMessage(message: any): Promise<void> {
		// Skip bot messages
		if (message.author.bot) return;

		try {
			// TODO: Process message with reply bots
			// This will be implemented when we fix the bot registry
			logger.debug(`Processing message from ${message.author.username}: ${message.content}`);
		} catch (error) {
			logger.error('Error processing message:', ensureError(error));
		}
	}

	private async handleInteraction(interaction: any): Promise<void> {
		if (interaction.isChatInputCommand()) {
			try {
				// TODO: Handle admin commands
				// This will be implemented when we fix the command handler
				logger.debug(`Processing command: ${interaction.commandName}`);
			} catch (error) {
				logger.error('Error processing interaction:', ensureError(error));
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
		logger.info('🎉 BunkBot started successfully');
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
		logger.info('Stopping BunkBot...');
		if (this.client) {
			await this.client.destroy();
		}
		logger.info('BunkBot stopped');
	}

}

// Main execution
async function main(): Promise<void> {
	try {
		const bunkBot = new BunkBotContainer();
		await bunkBot.initialize();
		await bunkBot.start();
	} catch (error) {
		logger.error('Failed to start BunkBot:', ensureError(error));
		process.exit(1);
	}
}

// Graceful shutdown
process.on('SIGINT', async () => {
	logger.info('Received SIGINT signal, shutting down BunkBot...');
	process.exit(0);
});

process.on('SIGTERM', async () => {
	logger.info('Received SIGTERM signal, shutting down BunkBot...');
	process.exit(0);
});

if (require.main === module) {
	main().catch(error => {
		console.error('Fatal error:', ensureError(error));
		process.exit(1);
	});
}
