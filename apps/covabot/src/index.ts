// CovaBot - AI personality bot container
import 'dotenv/config';
import { Events, Message, TextChannel } from 'discord.js';
import { createServer, IncomingMessage, ServerResponse } from 'http';

import {
	logger,
	ensureError,
	validateEnvironment,
	createDiscordClient,
	ClientConfigs,
	initializeObservability,
} from '@starbunk/shared';
import { createLLMService, LLMService } from './services/llmService';
import { WebServer } from './web/server';
import { QdrantMemoryService } from './services/qdrantMemoryService';

class CovaBotContainer {
	private client!: ReturnType<typeof createDiscordClient>;
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
		// Initialize LLM service
		this.llmService = createLLMService();
		logger.info('✅ LLM service initialized');

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
			const response = await this.llmService.generateResponse(message);
			// If LLM returns empty, use fallback responses
			if (!response || response.trim().length === 0) {
				logger.warn('[CovaBot] LLM returned empty response');
				return;
			}

			const textChannel = message.channel as TextChannel;
			await textChannel.send(response);
		} catch (error) {
			logger.error('Error in CovaBot message handling:', ensureError(error));
		}
	}

	async start(): Promise<void> {
		const token = process.env.COVABOT_TOKEN;
		if (!token) {
			throw new Error('COVABOT_TOKEN environment variable is required');
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
		// Check if web interface should be enabled (if COVABOT_WEB_PORT is set)
		const webPort = process.env.COVABOT_WEB_PORT;
		const enableWebInterface = webPort !== undefined && webPort !== '';

		if (enableWebInterface) {
			// Web interface mode - start with Qdrant and web server
			const useQdrant = process.env.USE_QDRANT !== 'false'; // Default to true
			const storageType = useQdrant ? 'Qdrant Vector Database' : 'Legacy';

			logger.info(`🤖 Starting CovaBot with Web Interface (${storageType} storage)...`);

			// Initialize Qdrant memory service
			if (useQdrant) {
				const memoryService = QdrantMemoryService.getInstance();
				await memoryService.initialize();
				logger.info('✅ Qdrant memory service initialized');
			}

			// Start web server
			const port = parseInt(webPort || '7080', 10);
			const webServer = new WebServer(port, useQdrant);
			await webServer.start();
			logger.info(`✅ Web interface started on http://localhost:${port}`);

			// Start the main CovaBot
			const covaBot = new CovaBotContainer();
			await covaBot.initialize();
			await covaBot.start();

			logger.info('🚀 CovaBot with Web Interface started successfully!');
			logger.info(`📝 Manage personality at: http://localhost:${port}`);
			logger.info(`🧠 Memory system: ${storageType}`);
		} else {
			// Standard mode - just start CovaBot
			const covaBot = new CovaBotContainer();
			await covaBot.initialize();
			await covaBot.start();
		}
	} catch (error) {
		logger.error('Failed to start CovaBot:', ensureError(error));
		process.exit(1);
	}
}

// Graceful shutdown
const shutdown = async () => {
	logger.info('🛑 Shutting down CovaBot...');

	try {
		const useQdrant = process.env.USE_QDRANT !== 'false';
		if (useQdrant && process.env.COVABOT_WEB_PORT) {
			const memoryService = QdrantMemoryService.getInstance();
			await memoryService.cleanup();
			logger.info('✅ Memory service cleanup completed');
		}
	} catch (error) {
		logger.error('❌ Error during cleanup:', ensureError(error));
	}

	process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

if (require.main === module) {
	main().catch((error) => {
		console.error('Fatal error:', ensureError(error));
		process.exit(1);
	});
}
