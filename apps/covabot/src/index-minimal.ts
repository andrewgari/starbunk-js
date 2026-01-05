// CovaBot - AI personality bot container (Minimal Bootstrap Demo)
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
	DiscordService,
	initializeObservability,
} from '@starbunk/shared';
import { getCovaIdentity } from './services/identity';
import { createLLMService, LLMService } from './services/llmService';
import { COVA_BOT_FALLBACK_RESPONSES } from './cova-bot/constants';

class CovaBotContainer {
	private client!: ReturnType<typeof createDiscordClient>;
	private webhookManager!: WebhookManager;
	private llmService!: LLMService;
	private hasInitialized = false;

	async initialize(): Promise<void> {
		logger.info('🤖 Initializing CovaBot container...');

		try {
			// Initialize observability (metrics + health/ready endpoints)
			try {
				initializeObservability('covabot');
				logger.info('✅ Observability initialized for CovaBot (minimal)');
			} catch (error) {
				logger.warn(
					'⚠️ Failed to initialize observability for CovaBot (minimal), continuing without HTTP metrics/health:',
					ensureError(error),
				);
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
			required: ['STARBUNK_TOKEN'],
			optional: ['DATABASE_URL', 'OPENAI_API_KEY', 'OLLAMA_API_URL', 'DEBUG', 'NODE_ENV', 'COVA_USER_ID'],
		});
		logger.info('✅ Environment validation passed for CovaBot');
	}

	private async initializeServices(): Promise<void> {
		// Register Discord client
		container.register(ServiceId.DiscordClient, this.client);

		// Initialize Discord service for identity lookups
		const discordService = new DiscordService(this.client);
		container.register(ServiceId.DiscordService, discordService);

		// Initialize webhook manager for AI personality responses
		this.webhookManager = new WebhookManager(this.client);
		container.register(ServiceId.WebhookService, this.webhookManager);

		// Initialize LLM service for AI personality responses
		this.llmService = createLLMService();
		logger.info('✅ LLM service initialized');

		// Initialize minimal database access for personality data
		if (process.env.DATABASE_URL) {
			logger.info('✅ Database connection available for personality data');
		} else {
			logger.info('ℹ️  No database URL provided, CovaBot will work without persistence');
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
			// Check if we should respond using LLM decision
			const shouldRespond = await this.llmService.shouldRespond(message);
			if (!shouldRespond) {
				return;
			}

			// Generate LLM response
			let response = await this.llmService.generateResponse(message);

			// If LLM returns empty, use fallback responses
			if (!response || response.trim().length === 0) {
				const fallbackResponses = COVA_BOT_FALLBACK_RESPONSES;
				response = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
				logger.debug('[CovaBot] Using fallback response due to empty LLM response');
			}

			// Get dynamic identity from Discord (server-specific nickname and avatar)
			const identity = await getCovaIdentity(message);

			if (!identity) {
				logger.warn('[CovaBot] Failed to get identity, skipping response');
				return;
			}

			// Send response using dynamic identity
			await this.webhookManager.sendMessage(message.channel.id, {
				content: response,
				username: identity.botName,
				avatarURL: identity.avatarUrl,
			});

			logger.debug(`[CovaBot] Sent response as "${identity.botName}"`);
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
