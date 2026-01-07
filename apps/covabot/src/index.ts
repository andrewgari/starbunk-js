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
	private httpEndpoints?: ReturnType<typeof initializeObservability>['httpEndpoints'];
	private discordConnected = false;
	private lastDiscordError?: Error;

	async initialize(): Promise<void> {
		logger.info('🤖 Initializing CovaBot container...');

		try {
			// Initialize observability (metrics + health/ready endpoints)
			try {
				const observability = initializeObservability('covabot');
				this.httpEndpoints = observability.httpEndpoints;

				// Add Discord connection health check
				this.httpEndpoints.addHealthCheck('discord_connection', async () => {
					if (!this.discordConnected) {
						return {
							name: 'discord_connection',
							status: 'fail',
							output: this.lastDiscordError
								? `Discord not connected: ${this.lastDiscordError.message}`
								: 'Discord not connected',
						};
					}

					// Check if client is still responsive
					try {
						const ping = this.client?.ws?.ping ?? -1;
						if (ping < 0) {
							return {
								name: 'discord_connection',
								status: 'warn',
								output: 'Discord connected but ping unavailable',
							};
						}

						return {
							name: 'discord_connection',
							status: ping > 500 ? 'warn' : 'pass',
							output: `Discord connected, ping: ${ping}ms`,
							duration_ms: ping,
						};
					} catch (error) {
						return {
							name: 'discord_connection',
							status: 'fail',
							output: `Discord health check failed: ${ensureError(error).message}`,
						};
					}
				});

				logger.info('✅ Observability initialized for CovaBot with Discord health check');
			} catch (error) {
				logger.warn(
					'⚠️ Failed to initialize observability for CovaBot, continuing without HTTP metrics/health:',
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
			this.lastDiscordError = ensureError(error);
			throw error;
		}
	}

	private validateEnvironment(): void {
		validateEnvironment({
			required: ['DISCORD_TOKEN'],
			optional: ['DATABASE_URL', 'OPENAI_API_KEY', 'OLLAMA_API_URL', 'DEBUG', 'NODE_ENV', 'COVA_USER_ID', 'CLIENT_ID'],
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
			this.lastDiscordError = error;
			this.discordConnected = false;
		});

		this.client.on(Events.Warn, (warning: string) => {
			logger.warn('Discord client warning:', warning);
		});

		// Monitor WebSocket status for connection state
		this.client.on(Events.ShardDisconnect, () => {
			logger.warn('Discord WebSocket disconnected');
			this.discordConnected = false;
		});

		this.client.on(Events.ShardReconnecting, () => {
			logger.info('Discord WebSocket reconnecting...');
			this.discordConnected = false;
		});

		this.client.on(Events.ShardResume, () => {
			logger.info('Discord WebSocket resumed');
			this.discordConnected = true;
		});

		this.client.on(Events.MessageCreate, async (message: Message) => {
			await this.handleMessage(message);
		});

		this.client.once(Events.ClientReady, () => {
			logger.info('🤖 CovaBot is ready and connected to Discord');
			this.hasInitialized = true;
			this.discordConnected = true;
			this.lastDiscordError = undefined;
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
		const token = process.env.DISCORD_TOKEN;
		if (!token) {
			const error = new Error('DISCORD_TOKEN environment variable is required');
			this.lastDiscordError = error;
			throw error;
		}

		// Validate token format (basic check)
		if (!token.match(/^[\w-]+\.[\w-]+\.[\w-]+$/)) {
			const error = new Error('DISCORD_TOKEN appears to be invalid (incorrect format)');
			this.lastDiscordError = error;
			logger.error('❌ Invalid Discord token format');
			throw error;
		}

		// Attempt login with retry logic
		const maxRetries = 3;
		let lastError: Error | undefined;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				logger.info(`Attempting Discord login (attempt ${attempt}/${maxRetries})...`);
				await this.client.login(token);
				await this.waitForReady();
				logger.info('🎉 CovaBot started successfully');
				return;
			} catch (error) {
				lastError = ensureError(error);
				this.lastDiscordError = lastError;

				logger.error(`❌ Discord login attempt ${attempt}/${maxRetries} failed:`, lastError);

				// Check for specific error types
				if (lastError.message.includes('TOKEN_INVALID') || lastError.message.includes('Incorrect login')) {
					logger.error('❌ Discord token is invalid - cannot retry');
					throw new Error(`Invalid Discord token: ${lastError.message}`);
				}

				if (attempt < maxRetries) {
					const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
					logger.info(`Retrying in ${delay}ms...`);
					await new Promise(resolve => setTimeout(resolve, delay));
				}
			}
		}

		throw new Error(`Failed to connect to Discord after ${maxRetries} attempts: ${lastError?.message}`);
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

	let covaBot: CovaBotContainer | undefined;
	let webServer: WebServer | undefined;

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
				try {
					const memoryService = QdrantMemoryService.getInstance();
					await memoryService.initialize();
					logger.info('✅ Qdrant memory service initialized');
				} catch (error) {
					logger.error('❌ Failed to initialize Qdrant memory service:', ensureError(error));
					logger.warn('⚠️ Continuing without Qdrant - some features may be limited');
				}
			}

			// Start web server
			try {
				const port = parseInt(webPort || '7080', 10);
				webServer = new WebServer(port, useQdrant);
				await webServer.start();
				logger.info(`✅ Web interface started on http://localhost:${port}`);
			} catch (error) {
				logger.error('❌ Failed to start web server:', ensureError(error));
				logger.warn('⚠️ Continuing without web interface');
			}

			// Start the main CovaBot
			covaBot = new CovaBotContainer();
			await covaBot.initialize();
			await covaBot.start();

			logger.info('🚀 CovaBot with Web Interface started successfully!');
			if (webServer) {
				logger.info(`📝 Manage personality at: http://localhost:${webPort}`);
			}
			logger.info(`🧠 Memory system: ${storageType}`);
		} else {
			// Standard mode - just start CovaBot
			covaBot = new CovaBotContainer();
			await covaBot.initialize();
			await covaBot.start();
		}
	} catch (error) {
		const err = ensureError(error);
		logger.error('❌ Failed to start CovaBot:', err);

		// Cleanup any partially initialized services
		if (covaBot) {
			try {
				await covaBot.stop();
			} catch (cleanupError) {
				logger.error('Error during cleanup:', ensureError(cleanupError));
			}
		}

		// Give observability time to flush logs/metrics before exiting
		await new Promise(resolve => setTimeout(resolve, 2000));

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
