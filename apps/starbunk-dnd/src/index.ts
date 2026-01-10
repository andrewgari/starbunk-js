// Starbunk-DND - D&D features and Snowbunk bridge container
import { Events } from 'discord.js';
import { createServer, IncomingMessage, ServerResponse } from 'http';

import {
	logger,
	ensureError,
	validateEnvironment,
	createDiscordClient,
	ClientConfigs,
	container,
	ServiceId,
	getMessageFilter,
	MessageFilter,
	initializeObservability,
	createStarbunkDNDMetrics,
	type StarbunkDNDMetrics,
} from '@starbunk/shared';

type ChatInputInteraction = {
	isChatInputCommand(): boolean;
	commandName: string;
	reply: (opts: { content: string; ephemeral?: boolean }) => Promise<unknown>;
	followUp: (opts: { content: string; ephemeral?: boolean }) => Promise<unknown>;
	user?: { username?: string };
	deferred?: boolean;
	replied?: boolean;
	channelId?: string;
	guildId?: string;
};

type Destroyable = { destroy: () => Promise<void> | void };

class StarbunkDNDContainer {
	private client!: ReturnType<typeof createDiscordClient>;
	private messageFilter!: MessageFilter;
	private starbunkDNDMetrics?: StarbunkDNDMetrics;
	private snowbunkClient: Destroyable | null = null;
	private hasInitialized = false;
	private httpEndpoints?: Awaited<ReturnType<typeof initializeObservability>>['httpEndpoints'];
	private discordConnected = false;
	private lastDiscordError?: Error;

	async initialize(): Promise<void> {
		logger.info('🐉 Initializing Starbunk-DND container...');

		try {
			// Initialize observability first
			const {
				metrics,
				logger: _structuredLogger,
				channelTracker: _channelTracker,
				httpEndpoints,
			} = await initializeObservability('starbunk-dnd');

			this.httpEndpoints = httpEndpoints;

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

			logger.info('✅ Observability initialized for Starbunk-DND with Discord health check');

			// Initialize Starbunk-DND-specific metrics collector
			try {
				this.starbunkDNDMetrics = createStarbunkDNDMetrics(metrics, {
					enableDetailedTracking: true,
					enablePerformanceMetrics: true,
					enableErrorTracking: true,
				});
				logger.info(
					'✅ Starbunk-DND-specific metrics collector initialized for D&D campaign and LLM monitoring',
				);
			} catch (error) {
				logger.warn(
					'⚠️ Starbunk-DND metrics initialization failed, continuing without container-specific metrics:',
					ensureError(error),
				);
				this.starbunkDNDMetrics = undefined;
			}

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
			required: ['DISCORD_TOKEN'],
			optional: [
				'SNOWBUNK_TOKEN',
				'DATABASE_URL',
				'OPENAI_API_KEY',
				'OLLAMA_API_URL',
				'VECTOR_CONTEXT_DIR',
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
			this.lastDiscordError = error;
			this.discordConnected = false;
		});

		this.client.on(Events.Warn, (warning: string) => {
			logger.warn('Discord client warning:', warning);
		});

		this.client.on(Events.InteractionCreate, async (interaction: unknown) => {
			if (!this.isChatInputCommand(interaction)) return;
			await this.handleInteraction(interaction);
		});

		this.client.once(Events.ClientReady, () => {
			logger.info('🐉 Starbunk-DND is ready and connected to Discord');
			this.hasInitialized = true;
			this.discordConnected = true;
			this.lastDiscordError = undefined;
		});

		this.client.on(Events.ShardDisconnect, () => {
			logger.warn('Discord shard disconnected');
			this.discordConnected = false;
		});

		this.client.on(Events.ShardReconnecting, () => {
			logger.info('Discord shard reconnecting...');
			this.discordConnected = false;
		});

		this.client.on(Events.ShardResume, () => {
			logger.info('Discord shard resumed');
			this.discordConnected = true;
			this.lastDiscordError = undefined;
		});
	}

	private async handleInteraction(interaction: ChatInputInteraction): Promise<void> {
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
							ephemeral: true,
						});
					} else {
						// Silently ignore in production mode
						await interaction.reply({
							content: '🚫 D&D commands are not available in this server/channel.',
							ephemeral: true,
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

	private isChatInputCommand(i: unknown): i is ChatInputInteraction {
		return (
			typeof (i as { isChatInputCommand?: unknown })?.isChatInputCommand === 'function' &&
			(i as { isChatInputCommand: () => boolean }).isChatInputCommand()
		);
	}

	async start(): Promise<void> {
		const token = process.env.DISCORD_TOKEN;
		if (!token) {
			throw new Error('DISCORD_TOKEN environment variable is required');
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

		// Clean up metrics collector
		if (this.starbunkDNDMetrics) {
			try {
				await this.starbunkDNDMetrics.cleanup();
				logger.info('✅ Starbunk-DND metrics collector cleaned up');
			} catch (error) {
				logger.error('❌ Error cleaning up Starbunk-DND metrics:', ensureError(error));
			}
		}

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
	if (process.env.CI_SMOKE_MODE === 'true') {
		logger.info('CI_SMOKE_MODE enabled: starting minimal health server and skipping Discord login');
		const port = process.env.HEALTH_PORT ? parseInt(process.env.HEALTH_PORT) : 3005;
		const server = createServer((req: IncomingMessage, res: ServerResponse) => {
			if (req.url === '/health') {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ status: 'healthy', mode: 'smoke', timestamp: new Date().toISOString() }));
				return;
			}
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('Not Found');
		});
		server.listen(port, () => logger.info(`🏥 [SMOKE] Starbunk-DND health server running on port ${port}`));
		const shutdown = (_signal: string) => {
			server.close(() => process.exit(0));
		};
		process.on('SIGINT', () => shutdown('SIGINT'));
		process.on('SIGTERM', () => shutdown('SIGTERM'));
		return;
	}
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
	logger.info('Received SIGTERM signal, shutting down Starbunk-DND...');

	try {
		const { shutdownObservability } = await import('@starbunk/shared');
		await shutdownObservability();
		logger.info('Observability stack shutdown completed');
	} catch (error) {
		logger.error('Error during observability shutdown:', ensureError(error));
	}

	process.exit(0);
});

// Global error handlers to properly log unhandled errors with structured logging
process.on('uncaughtException', (error: Error) => {
	logger.error('Uncaught exception:', error);
	process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
	const error = ensureError(reason);
	logger.error('Unhandled promise rejection:', error);
	process.exit(1);
});

if (require.main === module) {
	main().catch((error) => {
		logger.error('Fatal error in main:', ensureError(error));
		process.exit(1);
	});
}
