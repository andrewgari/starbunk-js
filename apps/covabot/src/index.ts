// CovaBot - AI personality bot container
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
	createCovaBotMetrics,
	type CovaBotMetrics,
} from '@starbunk/shared';
import { CovaBot } from './cova-bot/covaBot';
import { covaTrigger, covaDirectMentionTrigger, covaStatsCommandTrigger } from './cova-bot/triggers';

class CovaBotContainer {
	private client!: ReturnType<typeof createDiscordClient>;
	private webhookManager!: WebhookManager;
	private messageFilter!: MessageFilter;
	private covaBotMetrics?: CovaBotMetrics;
	private hasInitialized = false;

	async initialize(): Promise<void> {
		logger.info('🤖 Initializing CovaBot container...');

		try {
			// Initialize observability first
			const {
				metrics,
				logger: _structuredLogger,
				channelTracker: _channelTracker,
			} = initializeObservability('covabot');
			logger.info('✅ Observability initialized for CovaBot');

			// Initialize CovaBot-specific metrics collector
			try {
				this.covaBotMetrics = createCovaBotMetrics(metrics, {
					enableDetailedTracking: true,
					enablePerformanceMetrics: true,
					enableErrorTracking: true,
				});
				logger.info('✅ CovaBot-specific metrics collector initialized for AI personality monitoring');
			} catch (error) {
				logger.warn(
					'⚠️ CovaBot metrics initialization failed, continuing without container-specific metrics:',
					ensureError(error),
				);
				this.covaBotMetrics = undefined;
			}

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
			required: [],
			optional: [
				'COVABOT_TOKEN',
				'STARBUNK_TOKEN',
				'DATABASE_URL',
				'OPENAI_API_KEY',
				'OLLAMA_API_URL',
				'DEBUG_MODE',
				'TESTING_SERVER_IDS',
				'TESTING_CHANNEL_IDS',
				'NODE_ENV',
			],
		});
	}

	private async initializeServices(): Promise<void> {
		// Register Discord client
		container.register(ServiceId.DiscordClient, this.client);

		// Register DiscordService from client
		const discordService = new DiscordService(this.client);
		container.register(ServiceId.DiscordService, discordService);

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
		// Skip bot messages, except when running E2E webhook tests in debug mode on whitelisted channels
		const isWebhookMessage = Boolean(message.webhookId);
		const allowWebhookE2E =
			process.env.E2E_ALLOW_WEBHOOK_TESTS === 'true' &&
			this.messageFilter.isDebugMode() &&
			this.messageFilter.getTestingChannelIds().includes(message.channel.id);
		if (message.author.bot && !(isWebhookMessage && allowWebhookE2E)) return;

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

			// Process message with AI Cova personality using triggers
			const cova = new CovaBot(
				{
					name: 'CovaBot',
					description: 'AI personality bot with contextual response logic',
					defaultIdentity: {
						botName: 'Cova',
						avatarUrl:
							'https://cdn.discordapp.com/avatars/139592376443338752/8d9b24dbb47e564f3292d5c86c5ed075.png?size=256',
					},
					triggers: [covaStatsCommandTrigger, covaDirectMentionTrigger, covaTrigger],
					// Set to 100% since response logic is handled in individual triggers
					defaultResponseRate: 100,
					skipBotMessages: true,
				},
				this.covaBotMetrics,
			);
			await cova.processMessage(message);
		} catch (error) {
			logger.error('Error in CovaBot message handling:', ensureError(error));
		}
	}

	async start(): Promise<void> {
		const token = process.env.COVABOT_TOKEN || process.env.STARBUNK_TOKEN;
		if (!token) {
			throw new Error('COVABOT_TOKEN or STARBUNK_TOKEN environment variable is required');
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

		// Clean up metrics collector
		if (this.covaBotMetrics) {
			try {
				await this.covaBotMetrics.cleanup();
				logger.info('✅ CovaBot metrics collector cleaned up');
			} catch (error) {
				logger.error('❌ Error cleaning up CovaBot metrics:', ensureError(error));
			}
		}

		if (this.client) {
			await this.client.destroy();
		}
		logger.info('CovaBot stopped');
	}
}

// Main execution

async function main(): Promise<void> {
	if (process.env.CI_SMOKE_MODE === 'true') {
		logger.info('CI_SMOKE_MODE enabled: starting minimal health server and skipping Discord login');
		const port = process.env.HEALTH_PORT ? parseInt(process.env.HEALTH_PORT) : 3003;
		const server = createServer((req: IncomingMessage, res: ServerResponse) => {
			if (req.url === '/health') {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ status: 'healthy', mode: 'smoke', timestamp: new Date().toISOString() }));
				return;
			}
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('Not Found');
		});
		server.listen(port, () => logger.info(`🏥 [SMOKE] CovaBot health server running on port ${port}`));
		const shutdown = (_signal: string) => {
			server.close(() => process.exit(0));
		};
		process.on('SIGINT', () => shutdown('SIGINT'));
		process.on('SIGTERM', () => shutdown('SIGTERM'));
		return;
	}
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

	try {
		const { shutdownObservability } = await import('@starbunk/shared');
		await shutdownObservability();
		logger.info('Observability stack shutdown completed');
	} catch (error) {
		logger.error('Error during observability shutdown:', ensureError(error));
	}

	process.exit(0);
});

process.on('SIGTERM', async () => {
	logger.info('Received SIGTERM signal, shutting down CovaBot...');

	try {
		const { shutdownObservability } = await import('@starbunk/shared');
		await shutdownObservability();
		logger.info('Observability stack shutdown completed');
	} catch (error) {
		logger.error('Error during observability shutdown:', ensureError(error));
	}

	process.exit(0);
});

if (require.main === module) {
	main().catch((error) => {
		console.error('Fatal error:', ensureError(error));
		process.exit(1);
	});
}
