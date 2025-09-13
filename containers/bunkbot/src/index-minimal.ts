// BunkBot - Reply bots and admin commands container (Minimal Bootstrap Demo)
import { Events, Client, Message, Interaction } from 'discord.js';
import {
	ClientConfigs,
	container,
	createDiscordClient,
	ensureError,
	logger,
	ServiceId,
	validateEnvironment,
	WebhookManager,
} from '@starbunk/shared';

class BunkBotContainer {
	private client!: Client;
	private webhookManager!: WebhookManager;
	private hasInitialized = false;

	async initialize(): Promise<void> {
		logger.info('🤖 Initializing BunkBot container...');

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

	async start(): Promise<void> {
		const token = process.env.STARBUNK_TOKEN;
		if (!token) {
			throw new Error('STARBUNK_TOKEN environment variable is required');
		}

		await this.client.login(token);
		await this.waitForReady();
		logger.info('🎉 BunkBot started successfully');
	}

	async stop(): Promise<void> {
		logger.info('Stopping BunkBot...');
		if (this.client) {
			await this.client.destroy();
		}
		logger.info('BunkBot stopped');
	}

	private validateEnvironment(): void {
		validateEnvironment({
			required: ['STARBUNK_TOKEN'],
			optional: ['DATABASE_URL', 'DEBUG', 'NODE_ENV'],
		});
		logger.info('✅ Environment validation passed for BunkBot');
	}

	private async initializeServices(): Promise<void> {
		// Register Discord client
		container.register(ServiceId.DiscordClient, this.client);

		// Initialize webhook manager for reply bots
		this.webhookManager = new WebhookManager(this.client);
		container.register(ServiceId.WebhookService, this.webhookManager);

		// Initialize database if URL is provided
		if (process.env.DATABASE_URL) {
			logger.info('✅ Database connection available for reply bot data');
		} else {
			logger.info('ℹ️  No database URL provided, reply bots will work without persistence');
		}

		logger.info('✅ BunkBot services initialized');
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

		this.client.on(Events.InteractionCreate, async (interaction: Interaction) => {
			await this.handleInteraction(interaction);
		});

		this.client.once(Events.ClientReady, () => {
			logger.info('🤖 BunkBot is ready and connected to Discord');
			this.hasInitialized = true;
		});
	}

	private async handleMessage(message: Message): Promise<void> {
		// Skip bot messages
		if (message.author.bot) return;

		try {
			// Demo: Simple reply bot functionality
			if (message.content.toLowerCase().includes('hello bunkbot')) {
				await this.webhookManager.sendMessage(message.channel.id, {
					content: `Hello ${message.author.username}! BunkBot is working! 🤖`,
					username: 'BunkBot',
					avatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png',
				});
			}
		} catch (error) {
			logger.error('Error processing message:', ensureError(error));
		}
	}

	private async handleInteraction(interaction: Interaction): Promise<void> {
		if (interaction.isChatInputCommand()) {
			try {
				// Demo: Simple admin command
				if (interaction.commandName === 'ping') {
					await interaction.reply('Pong! BunkBot is operational! 🏓');
				}
			} catch (error) {
				logger.error('Error processing interaction:', ensureError(error));
			}
		}
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
	main().catch((error) => {
		console.error('Fatal error:', ensureError(error));
		process.exit(1);
	});
}
