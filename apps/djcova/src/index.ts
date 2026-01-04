// DJCova - Music service container
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
	createDJCovaMetrics,
	type DJCovaMetrics,
	getDiscordToken,
} from '@starbunk/shared';
import { CommandHandler } from './commandHandler';
import { DJCova } from './djCova';

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
	private client!: ReturnType<typeof createDiscordClient>;
	private messageFilter!: MessageFilter;
	private commandHandler!: CommandHandler;
	private musicPlayer!: DJCova;
	private djCovaMetrics?: DJCovaMetrics;
	public activeSubscription: { unsubscribe(): void } | null = null;
	private hasInitialized = false;

	async initialize(): Promise<void> {
		logger.info('🎵 Initializing DJCova container...');

		try {
			// Initialize observability first
			const {
				metrics,
				logger: _structuredLogger,
				channelTracker: _channelTracker,
			} = initializeObservability('djcova');
				// Ensure the base logger uses the correct service name so Promtail/Grafana
				// can label logs properly (service="djcova" instead of "unknown_service").
				// This complements the Docker label com.starbunk.service="djcova".
				logger.setServiceName('djcova');
				logger.enableStructuredLogging(true);
			logger.info('✅ Observability initialized for DJCova');

			// Initialize DJCova-specific metrics collector
			try {
				this.djCovaMetrics = createDJCovaMetrics(metrics, {
					enableDetailedTracking: true,
					enablePerformanceMetrics: true,
					enableErrorTracking: true,
				});
				logger.info('✅ DJCova-specific metrics collector initialized for music service monitoring');
			} catch (error) {
				logger.warn(
					'⚠️ DJCova metrics initialization failed, continuing without container-specific metrics:',
					ensureError(error),
				);
				this.djCovaMetrics = undefined;
			}

			// Validate environment
			this.validateEnvironment();

			// Create Discord client with voice capabilities
			this.client = createDiscordClient(ClientConfigs.DJCova);

			// Initialize services
			await this.initializeServices();

			// Set up event handlers
			this.setupEventHandlers();

			logger.info('✅ DJCova container initialized successfully');
		} catch (error) {
			logger.error('❌ Failed to initialize DJCova container:', ensureError(error));
			throw error;
		}
	}

	private validateEnvironment(): void {
		validateEnvironment({
			required: ['STARBUNK_TOKEN', 'CLIENT_ID'],
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

		// Initialize message filter
		this.messageFilter = getMessageFilter();
		container.register(ServiceId.MessageFilter, this.messageFilter);

		// Initialize music player with metrics
		this.musicPlayer = new DJCova(this.djCovaMetrics);
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
		});

		this.client.on(Events.Warn, (warning: string) => {
			logger.warn('Discord client warning:', warning);
		});

		this.client.on(Events.InteractionCreate, async (interaction: unknown) => {
			if (!this.isChatInputCommand(interaction)) return;
			await this.handleInteraction(interaction);
		});

		this.client.once(Events.ClientReady, () => {
			logger.info('🎵 DJCova is ready and connected to Discord');
			this.hasInitialized = true;
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
							content: `🚫 Music command filtered: ${filterResult.reason}`,
							ephemeral: true,
						});
					} else {
						// Silently ignore in production mode
						await interaction.reply({
							content: '🚫 Music commands are not available in this server/channel.',
							ephemeral: true,
						});
					}
					return;
				}

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
		// Get Discord token with smart fallback logic
		const token = getDiscordToken({ containerName: 'DJCOVA', logger });

		await this.client.login(token);
		await this.waitForReady();
		logger.info('🎉 DJCova started successfully');
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
	try {
		const djCova = new DJCovaContainer();
		await djCova.initialize();
		await djCova.start();
	} catch (error) {
		logger.error('Failed to start DJCova:', ensureError(error));
		process.exit(1);
	}
}

// Graceful shutdown
process.on('SIGINT', async () => {
	logger.info('Received SIGINT signal, shutting down DJCova...');

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
	logger.info('Received SIGTERM signal, shutting down DJCova...');

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
