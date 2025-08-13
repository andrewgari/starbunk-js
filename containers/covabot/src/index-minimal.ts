// CovaBot - AI personality bot container (Minimal Bootstrap Demo)
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
} from '@starbunk/shared';

class CovaBotContainer {
	private client!: ReturnType<typeof createDiscordClient>;
	private webhookManager!: WebhookManager;
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
			optional: ['DATABASE_URL', 'OPENAI_API_KEY', 'OLLAMA_API_URL', 'DEBUG', 'NODE_ENV'],
		});
		logger.info('✅ Environment validation passed for CovaBot');
	}

	private async initializeServices(): Promise<void> {
		// Register Discord client
		container.register(ServiceId.DiscordClient, this.client);

		// Initialize webhook manager for AI personality responses
		this.webhookManager = new WebhookManager(this.client);
		container.register(ServiceId.WebhookService, this.webhookManager);

		// Initialize minimal database access for personality data
		if (process.env.DATABASE_URL) {
			logger.info('✅ Database connection available for personality data');
		} else {
			logger.info('ℹ️  No database URL provided, CovaBot will work without persistence');
		}

		// Initialize LLM services for AI personality
		if (process.env.OPENAI_API_KEY || process.env.OLLAMA_API_URL) {
			logger.info('✅ LLM services available for AI personality');
		} else {
			logger.info('ℹ️  No LLM API keys provided, CovaBot will use simple responses');
		}

		logger.info('✅ CovaBot services initialized');
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
			// Demo: AI personality responses
			const content = message.content.toLowerCase();

			if (content.includes('cova') || content.includes('ai')) {
				const responses = [
					"I'm learning from every conversation! 🧠",
					"That's an interesting perspective! 🤔",
					'I love chatting with humans! 💬',
					'Tell me more about that! 🎯',
					"Fascinating! I'm always curious to learn! ✨",
				];

				const randomResponse = responses[Math.floor(Math.random() * responses.length)];

				await this.webhookManager.sendMessage(message.channel.id, {
					content: randomResponse,
					username: 'Cova',
					avatarURL: 'https://cdn.discordapp.com/embed/avatars/1.png',
				});
			}
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
	main().catch((error) => {
		console.error('Fatal error:', ensureError(error));
		process.exit(1);
	});
}
