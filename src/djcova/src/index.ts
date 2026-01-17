// DJCova - Music service container
import { Events, Client, GatewayIntentBits } from 'discord.js';
import { createServer, IncomingMessage, ServerResponse } from 'http';

import { CommandHandler } from './command-handler';
import { DJCova } from './dj-cova';
import { logger } from '@starbunk/shared';
import {
	ensureError,
	container,
	ServiceId,
	initializeObservability,
	shutdownObservability,
	createDJCovaMetrics,
	validateEnvironment,
} from './utils';

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

class DJCovaContainer {
	private client!: Client;
	private commandHandler!: CommandHandler;
	private musicPlayer!: DJCova;
	public activeSubscription: { unsubscribe(): void } | null = null;
	private hasInitialized = false;
	private discordConnected = false;
	private lastDiscordError?: Error;
	private httpEndpoints?: Awaited<ReturnType<typeof initializeObservability>>['httpEndpoints'];
	private djCovaMetrics?: Awaited<ReturnType<typeof createDJCovaMetrics>>;

	async initialize(): Promise<void> {
		logger.info('🎵 Initializing DJCova container...');

		try {
			// Initialize observability first
			const {
				metrics,
				logger: _structuredLogger,
				channelTracker: _channelTracker,
				httpEndpoints,
			} = await initializeObservability('djcova');

			this.httpEndpoints = httpEndpoints;

			// Ensure the base logger uses the correct service name so Promtail/Grafana
			// can label logs properly (service="djcova" instead of "unknown_service").
			// This complements the Docker label com.starbunk.service="djcova".
			logger.setServiceName('djcova');
			logger.enableStructuredLogging(true);
			logger.info('✅ Observability initialized for DJCova');

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

			// Initialize DJCova-specific metrics collector
			try {
				this.djCovaMetrics = createDJCovaMetrics(metrics, {
					enableDetailedTracking: true,
					enablePerformanceMetrics: true,
					enableErrorTracking: true,
				});
				logger.info('✅ DJCova-specific metrics collector initialized for music service monitoring');
			} catch (error) {
				const err = ensureError(error);
				logger.warn(
					'⚠️ DJCova metrics initialization failed, continuing without container-specific metrics:',
					{ error: err.message, stack: err.stack },
				);
				this.djCovaMetrics = undefined;
			}

			// Validate environment
			this.validateEnvironment();

			// Create Discord client with minimal required intents for music bot
			// Only needs: Guilds (basic functionality), GuildVoiceStates (voice connections)
			// Removed: GuildMessages, MessageContent (uses slash commands via InteractionCreate, not message-based)
			this.client = new Client({
				intents: [
					GatewayIntentBits.Guilds,
					GatewayIntentBits.GuildVoiceStates, // Required for voice
				],
			});

			// Set up error handling
			this.client.on('error', (error) => logger.error('Discord client error:', error));
			this.client.on('warn', (warning) => logger.warn('Discord client warning:', { warning }));

			// Initialize services
			await this.initializeServices();

			// Set up event handlers
			this.setupEventHandlers();

			logger.info('✅ DJCova container initialized successfully');
		} catch (error) {
			logger.error('❌ Failed to initialize DJCova container:', ensureError(error));
			this.lastDiscordError = ensureError(error);
			throw error;
		}
	}

	private validateEnvironment(): void {
		validateEnvironment({
			required: ['DISCORD_TOKEN', 'CLIENT_ID'],
			optional: [
				'DEBUG_MODE',
				'TESTING_SERVER_IDS',
				'TESTING_CHANNEL_IDS',
				'NODE_ENV',
				'MUSIC_IDLE_TIMEOUT_SECONDS',
			],
		});
	}

	private async initializeServices(): Promise<void> {
		// Register Discord client
		container.register(ServiceId.DiscordClient, this.client);

		// Initialize music player with metrics
		this.musicPlayer = new DJCova();
		container.register(ServiceId.MusicPlayer, this.musicPlayer);

		// Initialize command handler
		this.commandHandler = new CommandHandler();
		await this.commandHandler.registerCommands();

		// Note: DJCova doesn't need database access
		logger.info('DJCova services initialized (no database required)');
	}

	private setupEventHandlers(): void {
		this.client.on(Events.Error, (error: Error) => {
			logger.error('Discord client error:', error);
			this.lastDiscordError = error;
			this.discordConnected = false;
		});

		this.client.on(Events.Warn, (warning: string) => {
			logger.warn('Discord client warning:', { warning });
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

		this.client.on(Events.InteractionCreate, async (interaction: unknown) => {
			if (!this.isChatInputCommand(interaction)) return;
			await this.handleInteraction(interaction);
		});

		this.client.once(Events.ClientReady, () => {
			logger.info('🎵 DJCova is ready and connected to Discord');
			this.hasInitialized = true;
			this.discordConnected = true;
			this.lastDiscordError = undefined;
		});
	}

	private async handleInteraction(interaction: ChatInputInteraction): Promise<void> {
		if (interaction.isChatInputCommand()) {
			try {
				// Handle music commands using the command handler
				await this.commandHandler.handleInteraction(interaction);
			} catch (error) {
				logger.error('Error processing music interaction:', ensureError(error));
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
		let lastError: Error | undefined = undefined;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				logger.info(`Attempting Discord login (attempt ${attempt}/${maxRetries})...`);
				await this.client.login(token);
				await this.waitForReady();
				logger.info('🎉 DJCova started successfully');
				return;
			} catch (error) {
				lastError = ensureError(error);
				this.lastDiscordError = lastError;

				logger.error(`❌ Discord login attempt ${attempt}/${maxRetries} failed:`, lastError);

				// Check for specific error types
				if (
					lastError &&
					(lastError.message.includes('TOKEN_INVALID') || lastError.message.includes('Incorrect login'))
				) {
					logger.error('❌ Discord token is invalid - cannot retry');
					throw new Error(`Invalid Discord token: ${lastError.message}`);
				}

				if (attempt < maxRetries) {
					const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
					logger.info(`Retrying in ${delay}ms...`);
					await new Promise((resolve) => setTimeout(resolve, delay));
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
		logger.info('Stopping DJCova...');

		// Clean up metrics collector
		if (this.djCovaMetrics) {
			try {
				await this.djCovaMetrics.cleanup();
				logger.info('✅ DJCova metrics collector cleaned up');
			} catch (error) {
				logger.error('❌ Error cleaning up DJCova metrics:', ensureError(error));
			}
		}

		if (this.activeSubscription) {
			this.activeSubscription.unsubscribe();
		}
		if (this.client) {
			await this.client.destroy();
		}
		logger.info('DJCova stopped');
	}
}

// Main execution
async function main(): Promise<void> {
	if (process.env.CI_SMOKE_MODE === 'true') {
		logger.info('CI_SMOKE_MODE enabled: starting minimal health server and skipping Discord login');
		const port = process.env.HEALTH_PORT ? parseInt(process.env.HEALTH_PORT) : 3004;
		const server = createServer((req: IncomingMessage, res: ServerResponse) => {
			if (req.url === '/health') {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ status: 'healthy', mode: 'smoke', timestamp: new Date().toISOString() }));
				return;
			}
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('Not Found');
		});
		server.listen(port, () => logger.info(`🏥 [SMOKE] DJCova health server running on port ${port}`));
		const shutdown = (_signal: string) => {
			server.close(() => process.exit(0));
		};
		process.on('SIGINT', () => shutdown('SIGINT'));
		process.on('SIGTERM', () => shutdown('SIGTERM'));
		return;
	}

	let djCova: DJCovaContainer | undefined;

	try {
		djCova = new DJCovaContainer();
		await djCova.initialize();
		await djCova.start();
	} catch (error) {
		const err = ensureError(error);
		logger.error('❌ Failed to start DJCova:', err);

		// Cleanup any partially initialized services
		if (djCova) {
			try {
				await djCova.stop();
			} catch (cleanupError) {
				logger.error('Error during cleanup:', ensureError(cleanupError));
			}
		}

		// Give observability time to flush logs/metrics before exiting
		await new Promise((resolve) => setTimeout(resolve, 2000));

		process.exit(1);
	}
}

// Graceful shutdown
process.on('SIGINT', async () => {
	logger.info('Received SIGINT signal, shutting down DJCova...');

	try {
		await shutdownObservability();
		logger.info('Observability stack shutdown completed');
	} catch (error) {
		const err = ensureError(error);
		logger.error('Error during observability shutdown:', { error: err.message, stack: err.stack });
	}

	process.exit(0);
});

process.on('SIGTERM', async () => {
	logger.info('Received SIGTERM signal, shutting down DJCova...');

	try {
		await shutdownObservability();
		logger.info('Observability stack shutdown completed');
	} catch (error) {
		const err = ensureError(error);
		logger.error('Error during observability shutdown:', { error: err.message, stack: err.stack });
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
