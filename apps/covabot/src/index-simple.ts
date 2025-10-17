/**
 * Simple CovaBot Entry Point
 *
 * Minimalist implementation - no triggers, no vector DB, no complex infrastructure
 * Just: Message → LLM with context → Response or silence
 */

import { Events, Message } from 'discord.js';
import { createServer, IncomingMessage, ServerResponse } from 'http';
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
	MessageFilter,
	initializeObservability,
	DiscordService,
} from '@starbunk/shared';
import { SimpleCovaBot } from './simpleCovaBot';

class SimpleCovaBotContainer {
	private client!: ReturnType<typeof createDiscordClient>;
	private webhookManager!: WebhookManager;
	private messageFilter!: MessageFilter;
	private bot!: SimpleCovaBot;
	private hasInitialized = false;

	async initialize(): Promise<void> {
		logger.info('🤖 Initializing Simple CovaBot...');

		try {
			// Initialize observability
			const { metrics, logger: _structuredLogger } = initializeObservability('covabot');
			logger.info('✅ Observability initialized');

			// Validate environment
			this.validateEnvironment();

			// Create Discord client
			this.client = createDiscordClient(ClientConfigs.CovaBot);

			// Initialize services
			await this.initializeServices();

			// Create the bot
			this.bot = new SimpleCovaBot();

			// Set up event handlers
			this.setupEventHandlers();

			logger.info('✅ Simple CovaBot initialized successfully');
		} catch (error) {
			logger.error('❌ Failed to initialize Simple CovaBot:', ensureError(error));
			throw error;
		}
	}

	private validateEnvironment(): void {
		validateEnvironment({
			required: [],
			optional: [
				'COVABOT_TOKEN',
				'STARBUNK_TOKEN',
				'OLLAMA_API_URL',
				'OLLAMA_MODEL',
				'DEBUG_MODE',
				'TESTING_SERVER_IDS',
				'TESTING_CHANNEL_IDS',
			],
		});
	}

	private async initializeServices(): Promise<void> {
		// Register Discord client
		container.register(ServiceId.DiscordClient, this.client);

		// Register DiscordService
		const discordService = new DiscordService(this.client);
		container.register(ServiceId.DiscordService, discordService);

		// Initialize webhook manager
		this.webhookManager = new WebhookManager(this.client);
		container.register(ServiceId.WebhookService, this.webhookManager);

		// Initialize message filter
		this.messageFilter = getMessageFilter();
		container.register(ServiceId.MessageFilter, this.messageFilter);

		logger.info('Simple CovaBot services initialized');
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
			logger.info('🤖 Simple CovaBot is ready and connected to Discord');
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
				if (this.messageFilter.isDebugMode()) {
					logger.debug(`Message filtered: ${filterResult.reason}`);
				}
				return;
			}

			// Process with simple bot
			await this.bot.processMessage(message);
		} catch (error) {
			logger.error('Error handling message:', ensureError(error));
		}
	}

	async start(): Promise<void> {
		const token = process.env.COVABOT_TOKEN || process.env.STARBUNK_TOKEN;
		if (!token) {
			throw new Error('COVABOT_TOKEN or STARBUNK_TOKEN environment variable is required');
		}

		await this.client.login(token);
		await this.waitForReady();
		logger.info('🎉 Simple CovaBot started successfully');
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
		logger.info('Stopping Simple CovaBot...');
		if (this.client) {
			await this.client.destroy();
		}
		logger.info('Simple CovaBot stopped');
	}
}

// Main execution
async function main(): Promise<void> {
	if (process.env.CI_SMOKE_MODE === 'true') {
		logger.info('CI_SMOKE_MODE enabled: starting minimal health server');
		const port = process.env.HEALTH_PORT ? parseInt(process.env.HEALTH_PORT) : 3332;
		const server = createServer((req: IncomingMessage, res: ServerResponse) => {
			if (req.url === '/health') {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ status: 'healthy', mode: 'smoke', timestamp: new Date().toISOString() }));
				return;
			}
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('Not Found');
		});
		server.listen(port, () => logger.info(`🏥 [SMOKE] Simple CovaBot health server running on port ${port}`));
		return;
	}

	try {
		const bot = new SimpleCovaBotContainer();
		await bot.initialize();
		await bot.start();
	} catch (error) {
		logger.error('Failed to start Simple CovaBot:', ensureError(error));
		process.exit(1);
	}
}

// Graceful shutdown
process.on('SIGINT', async () => {
	logger.info('Received SIGINT, shutting down...');
	try {
		const { shutdownObservability } = await import('@starbunk/shared');
		await shutdownObservability();
	} catch (error) {
		logger.error('Error during shutdown:', ensureError(error));
	}
	process.exit(0);
});

process.on('SIGTERM', async () => {
	logger.info('Received SIGTERM, shutting down...');
	try {
		const { shutdownObservability } = await import('@starbunk/shared');
		await shutdownObservability();
	} catch (error) {
		logger.error('Error during shutdown:', ensureError(error));
	}
	process.exit(0);
});

if (require.main === module) {
	main().catch((error) => {
		console.error('Fatal error:', ensureError(error));
		process.exit(1);
	});
}
