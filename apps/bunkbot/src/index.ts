// BunkBot - Reply bots and admin commands container
import { Events, Client, Message, Interaction } from 'discord.js';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import {
	logger,
	container,
	ServiceId,
	ensureError,
	validateEnvironment,
	createDiscordClient,
	ClientConfigs,
	WebhookManager,
	getMessageFilter,
	MessageFilter,
	runStartupDiagnostics,
	initializeObservability,
	createBunkBotMetrics,
	type BunkBotMetrics,
	type DiagnosticResult,
	EnhancedBunkBotMetricsCollector,
	BotTriggerTracker,
	initializeBotMetricsSystem,
} from '@starbunk/shared';

// Import DiscordService from the shared package exports
import { DiscordService } from '@starbunk/shared';

// Import commands
import pingCommand from './commands/ping';
import debugCommand from './commands/debug';

// Import reply bot system
import { BotRegistry } from './botRegistry';
// import { DatabaseBotFactory } from './core/database-bot-factory'; // Temporarily disabled
import { ReplyBotImpl } from './core/bot-builder';

// Import configuration services
import { ConfigurationService } from './services/configurationService';
import { BotIdentityService } from './services/botIdentityService';
import { MessageProcessor } from './core/MessageProcessor';
import { HealthServer } from './services/HealthServer';

class BunkBotContainer {
	private client!: Client;
	private webhookManager!: WebhookManager;
	private messageFilter!: MessageFilter;
	private configurationService!: ConfigurationService;
	private botIdentityService!: BotIdentityService;
	private hasInitialized = false;
	private commands = new Map();
	private healthServer: HealthServer | null = null;
	private replyBots: ReplyBotImpl[] = [];
	private messageProcessor!: MessageProcessor;
	private bunkBotMetrics?: BunkBotMetrics;
	private enhancedMetrics?: EnhancedBunkBotMetricsCollector;
	private triggerTracker?: BotTriggerTracker;

	async initialize(): Promise<void> {
		logger.info('🚀 Initializing BunkBot container...');

		try {
			// Initialize observability first
			// Skip HTTP endpoints since BunkBot has its own health server
			const {
				metrics,
				logger: _structuredLogger,
				channelTracker: _channelTracker,
			} = await initializeObservability('bunkbot', { skipHttpEndpoints: true });
			logger.info('✅ Observability initialized with metrics, structured logging, and channel activity tracking');

			// Initialize enhanced BunkBot metrics system with Redis integration
			try {
				// Initialize enhanced metrics system with auto-detected configuration
				const enhancedMetricsSystem = await initializeBotMetricsSystem(metrics, {
					enableEnhancedTracking: process.env.ENABLE_ENHANCED_BOT_TRACKING === 'true',
					enableBatchOperations: process.env.NODE_ENV === 'production',
				});

				this.enhancedMetrics = enhancedMetricsSystem.metricsCollector;
				this.triggerTracker = enhancedMetricsSystem.tracker;

				// Also initialize legacy metrics for backward compatibility
				this.bunkBotMetrics = createBunkBotMetrics(metrics, {
					enableDetailedTracking: true,
					enablePerformanceMetrics: true,
					enableErrorTracking: true,
				});

				logger.info('✅ Enhanced BunkBot metrics system initialized with Redis integration', {
					enhancedTracking: enhancedMetricsSystem.config.enableEnhancedTracking,
					batchOperations: enhancedMetricsSystem.config.enableBatchOperations,
					redisHost: enhancedMetricsSystem.config.redis?.host,
				});
			} catch (error) {
				logger.warn(
					'⚠️ Enhanced BunkBot metrics initialization failed, falling back to basic metrics:',
					ensureError(error),
				);

				// Fallback to basic metrics
				try {
					this.bunkBotMetrics = createBunkBotMetrics(metrics, {
						enableDetailedTracking: true,
						enablePerformanceMetrics: true,
						enableErrorTracking: true,
					});
					logger.info('✅ Basic BunkBot metrics collector initialized (fallback mode)');
				} catch (fallbackError) {
					logger.warn(
						'⚠️ All metrics initialization failed, continuing without container-specific metrics:',
						ensureError(fallbackError),
					);
					this.bunkBotMetrics = undefined;
				}
			}

			// Run startup diagnostics
			const diagnostics = await runStartupDiagnostics();
			const failures = diagnostics.filter((d: DiagnosticResult) => d.status === 'fail');

			if (failures.length > 0) {
				logger.error('❌ Critical startup issues detected:');
				for (const failure of failures) {
					logger.error(`  - ${failure.check}: ${failure.message}`);
				}
				throw new Error(`Startup failed due to ${failures.length} critical issues`);
			}

			// Validate environment
			this.validateEnvironment();

			// Create Discord client
			this.client = createDiscordClient(ClientConfigs.BunkBot);

			// Initialize services
			await this.initializeServices();

			// Initialize reply bot system
			await this.initializeReplyBots();

			// Initialize message processor with enhanced observability and metrics tracking
			this.messageProcessor = new MessageProcessor(
				this.messageFilter,
				this.replyBots,
				this.bunkBotMetrics,
				this.enhancedMetrics,
				this.triggerTracker,
			);

			const metricsStatus = this.enhancedMetrics
				? 'with enhanced Redis-based metrics'
				: this.bunkBotMetrics
					? 'with basic BunkBot metrics'
					: 'with base metrics only';
			logger.info(`✅ Message processor initialized ${metricsStatus}`);

			// Register commands
			this.registerCommands();

			// Set up event handlers
			this.setupEventHandlers();

			// Start health check server
			this.startHealthServer();

			logger.info('✅ BunkBot container initialized successfully');
		} catch (error) {
			logger.error('❌ Failed to initialize BunkBot container:', ensureError(error));
			throw error;
		}
	}

	private validateEnvironment(): void {
		validateEnvironment({
			required: ['DISCORD_TOKEN'],
			optional: [
				'DATABASE_URL',
				'DEBUG_MODE',
				'TESTING_SERVER_IDS',
				'TESTING_CHANNEL_IDS',
				'NODE_ENV',
				// Redis configuration for enhanced metrics
				'REDIS_HOST',
				'REDIS_PORT',
				'REDIS_PASSWORD',
				'REDIS_DB',
				'ENABLE_ENHANCED_BOT_TRACKING',
			],
		});
	}

	private async initializeServices(): Promise<void> {
		// Register Discord client
		container.register(ServiceId.DiscordClient, this.client);

		// Initialize and register Discord service for bot identity functionality
		const discordService = new DiscordService(this.client);
		// Use the same approach as the bootstrap function
		container.register(ServiceId.DiscordService, discordService);
		logger.info('✅ Discord identity service initialized and registered');

		// Initialize webhook manager
		this.webhookManager = new WebhookManager(this.client);
		container.register(ServiceId.WebhookService, this.webhookManager);

		// Initialize message filter
		this.messageFilter = getMessageFilter();
		container.register(ServiceId.MessageFilter, this.messageFilter);

		// Initialize configuration services - temporarily disabled due to Prisma issues
		// this.configurationService = new ConfigurationService();
		// this.botIdentityService = new BotIdentityService(this.configurationService);

		// Preload configuration cache
		// await this.configurationService.refreshCache();
		logger.info('✅ Configuration services temporarily disabled for logging test');

		// Database services temporarily disabled to focus on file-based bot loading
		logger.info('⚠️  Database services disabled - using file-based bot loading only');

		logger.info('BunkBot services initialized');
	}

	private async initializeReplyBots(): Promise<void> {
		logger.info('🤖 Initializing reply bot system...');

		try {
			// Track bot registry loading performance
			const loadStartTime = Date.now();

			// For now, focus on file-based bot loading only
			// Database bot loading is temporarily disabled to fix compilation issues
			logger.info('📁 Loading reply bots from file system...');
			this.replyBots = await BotRegistry.discoverBots();

			const loadDuration = Date.now() - loadStartTime;

			// Track bot registry load metrics
			if (this.bunkBotMetrics) {
				this.bunkBotMetrics.trackBotRegistryLoad(this.replyBots.length, loadDuration);
			}

			if (this.replyBots.length > 0) {
				logger.info(`✅ Reply bot system initialized with ${this.replyBots.length} bots`);
				logger.info('🤖 Active reply bots:');
				this.replyBots.forEach((bot) => {
					logger.info(`   - ${bot.name}: ${bot.description}`);
				});
			} else {
				logger.warn('⚠️  No reply bots were loaded - only slash commands are active');
			}
		} catch (error) {
			logger.error('❌ Failed to initialize reply bot system:', ensureError(error));
			// Track failed bot registry load
			if (this.bunkBotMetrics) {
				this.bunkBotMetrics.trackBotRegistryLoad(0, Date.now());
			}
			// Don't throw here - allow BunkBot to continue with just slash commands
			this.replyBots = [];
		}
	}

	private registerCommands(): void {
		// Register available commands
		this.commands.set('ping', pingCommand);
		this.commands.set('debug', debugCommand);

		logger.info(`Registered ${this.commands.size} commands: ${Array.from(this.commands.keys()).join(', ')}`);
	}

	private async deployCommands(): Promise<void> {
		try {
			logger.info('🚀 Deploying slash commands to Discord...');
			logger.info(`🔍 Bot Application ID: ${this.client.application?.id || 'Unknown'}`);
			logger.info(`🔍 Bot User ID: ${this.client.user?.id || 'Unknown'}`);

			// Collect command data
			const commandData = Array.from(this.commands.values()).map((command) => command.data);
			logger.info(`📋 Commands to deploy: ${commandData.map((cmd) => cmd.name).join(', ')}`);

			// Deploy commands to specific guild for faster updates during development
			const guildId = process.env.GUILD_ID;
			if (guildId && process.env.DEBUG_MODE === 'true') {
				logger.info(`🎯 Deploying commands to guild ${guildId} (debug mode)`);
				const guild = await this.client.guilds.fetch(guildId);
				await guild.commands.set(commandData);
			} else {
				// Deploy commands globally (available in all servers)
				logger.info('🌍 Deploying commands globally');
				await this.client.application!.commands.set(commandData);
			}

			logger.info(`✅ Successfully deployed ${commandData.length} slash commands to Discord`);
		} catch (error) {
			logger.error('❌ Failed to deploy commands to Discord:', ensureError(error));
			throw error;
		}
	}

	private startHealthServer(): void {
		const port = process.env.HEALTH_PORT ? parseInt(process.env.HEALTH_PORT) : undefined;

		this.healthServer = new HealthServer(port);
		this.healthServer.start(() => {
			const memory = process.memoryUsage();
			const connected = this.client?.isReady() || false;
			const initialized = this.hasInitialized;

			return {
				status: connected ? 'healthy' : 'degraded',
				timestamp: new Date().toISOString(),
				discord: {
					connected,
					initialized,
					latency: 0,
					guildCount: this.client?.guilds?.cache?.size,
					lastHeartbeat: Date.now(),
				},
				uptime: process.uptime(),
				memory: {
					used: memory.rss,
					total: memory.rss + memory.external,
					heapUsed: memory.heapUsed,
					heapTotal: memory.heapTotal,
					external: memory.external,
				},
				metrics: {
					totalRequests: 0,
					errorCount: 0,
					errorRate: 0,
					avgResponseTime: 0,
					activeConnections: 0,
				},
				bots: {
					loaded: this.replyBots.length,
					active: this.replyBots.filter((bot) => !bot.metadata?.disabled).length,
					circuitBreakersOpen: 0,
					storageSize: 0,
				},
				dependencies: {
					discord: {
						status: connected ? 'healthy' : 'unhealthy',
						latency: 0,
						lastCheck: Date.now(),
					},
					storage: {
						status: 'healthy',
						size: 0,
						oldestItem: Date.now(),
					},
				},
				configuration: {
					nodeEnv: process.env.NODE_ENV || 'unknown',
					debugMode: process.env.DEBUG_MODE === 'true',
					maxBotInstances: parseInt(process.env.MAX_BOT_INSTANCES || '50'),
					circuitBreakerEnabled: process.env.ENABLE_CIRCUIT_BREAKER !== 'false',
				},
			};
		});
	}

	private setupEventHandlers(): void {
		this.client.on(Events.Error, (error: Error) => {
			logger.error('Discord client error:', error);
		});

		this.client.on(Events.Warn, (warning: string) => {
			logger.warn('Discord client warning:', warning);
		});

		this.client.on(Events.MessageCreate, async (message: Message) => {
			logger.info(
				`🔥 DISCORD EVENT: MessageCreate received from ${message.author?.username || 'unknown'} (${message.author?.id || 'unknown'})`,
			);
			logger.info(`🔥   Content: "${message.content?.substring(0, 100) || 'no content'}"`);
			logger.info(
				`🔥   Channel: ${message.channel && 'name' in message.channel ? message.channel.name : 'unknown'} (${message.channel?.id || 'unknown'})`,
			);
			logger.info(`🔥   Guild: ${message.guild?.name || 'DM'} (${message.guild?.id || 'DM'})`);
			logger.info(`🔥   Author isBot: ${message.author?.bot || false}`);
			logger.info(`🔥   Webhook ID: ${message.webhookId || 'none'}`);
			logger.info(`🔥 → Passing to handleMessage...`);

			await this.handleMessage(message);
		});

		this.client.on(Events.InteractionCreate, async (interaction: Interaction) => {
			logger.info(
				`🎮 Received interaction: ${interaction.type} from ${interaction.user?.username || 'unknown'} - Command: ${'commandName' in interaction ? interaction.commandName : 'N/A'}`,
			);
			logger.info(
				`🔍 Interaction details: Guild=${interaction.guildId}, Channel=${interaction.channelId}, User=${interaction.user?.id}`,
			);
			await this.handleInteraction(interaction);
		});

		this.client.once(Events.ClientReady, async () => {
			logger.info('🤖 BunkBot is ready and connected to Discord');

			// Debug: Check if bot is in the target guild
			const guildId = process.env.GUILD_ID;
			if (guildId) {
				try {
					const guild = await this.client.guilds.fetch(guildId);
					logger.info(`✅ Bot is present in guild: ${guild.name} (${guild.id})`);
					logger.info(`🔍 Guild member count: ${guild.memberCount}`);
					logger.info(
						`🔍 Bot permissions in guild: ${guild.members.me?.permissions.toArray().join(', ') || 'Unknown'}`,
					);
				} catch (error) {
					logger.error(`❌ Bot is NOT in guild ${guildId}:`, ensureError(error));
					logger.error('🚨 This explains why slash commands are not working!');
					logger.error('🔧 You need to invite the bot to your Discord server first!');
				}
			}

			// Deploy commands to Discord now that client is ready
			try {
				await this.deployCommands();
			} catch (error) {
				logger.error('Failed to deploy commands, but continuing...', ensureError(error));
			}

			this.hasInitialized = true;
		});
	}

	private async handleMessage(message: Message): Promise<void> {
		logger.debug(
			`Processing message from ${message.author.username} in ${message.channel && 'name' in message.channel ? message.channel.name : 'DM'}`,
		);

		// Use the MessageProcessor which now includes comprehensive observability tracking
		await this.messageProcessor.processMessage(message);
	}

	private async handleInteraction(interaction: Interaction): Promise<void> {
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
							content: `🚫 Command filtered: ${filterResult.reason}`,
							ephemeral: true,
						});
					} else {
						// Silently ignore in production mode
						await interaction.reply({
							content: '🚫 This command is not available in this server/channel.',
							ephemeral: true,
						});
					}
					return;
				}

				const commandName = interaction.commandName;
				logger.debug(`Processing command: ${commandName} from ${interaction.user.username}`);

				// Get the command from our registered commands
				const command = this.commands.get(commandName);

				if (command) {
					logger.info(`🎮 Executing ${commandName} command`);
					await command.execute(interaction);
					logger.info(`✅ ${commandName} command completed successfully`);
				} else {
					logger.warn(`❓ Unknown command: ${commandName}`);
					await interaction.reply({
						content: `❓ Unknown command: \`${commandName}\`\nAvailable commands: ${Array.from(
							this.commands.keys(),
						)
							.map((cmd) => `\`${cmd}\``)
							.join(', ')}`,
						ephemeral: true,
					});
				}
			} catch (error) {
				logger.error(`Error processing command ${interaction.commandName}:`, ensureError(error));

				// Send error response if interaction hasn't been replied to
				try {
					if (!interaction.replied && !interaction.deferred) {
						await interaction.reply({
							content: '❌ An error occurred while processing the command.',
							ephemeral: true,
						});
					}
				} catch (replyError) {
					logger.error('Failed to send error response:', ensureError(replyError));
				}
			}
		}
	}

	async start(): Promise<void> {
		const token = process.env.DISCORD_TOKEN;
		if (!token) {
			throw new Error('DISCORD_TOKEN environment variable is required');
		}

		await this.client.login(token);
		await this.waitForReady();
		logger.info('🎉 BunkBot started successfully');
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
		logger.info('Stopping BunkBot...');

		// Clean up enhanced metrics first
		if (this.triggerTracker) {
			try {
				await this.triggerTracker.cleanup();
				logger.info('✅ Enhanced BunkBot trigger tracker cleaned up successfully');
			} catch (error) {
				logger.error('❌ Error cleaning up enhanced trigger tracker:', ensureError(error));
			}
		}

		if (this.enhancedMetrics) {
			try {
				await this.enhancedMetrics.cleanup();
				logger.info('✅ Enhanced BunkBot metrics collector cleaned up successfully');
			} catch (error) {
				logger.error('❌ Error cleaning up enhanced metrics:', ensureError(error));
			}
		}

		// Clean up legacy metrics
		if (this.bunkBotMetrics) {
			try {
				await this.bunkBotMetrics.cleanup();
				logger.info('✅ Basic BunkBot metrics collector cleaned up successfully');
			} catch (error) {
				logger.error('❌ Error cleaning up basic BunkBot metrics:', ensureError(error));
			}
		}

		// Stop health server
		if (this.healthServer) {
			await this.healthServer.stop();
		}

		// Disconnect configuration services - temporarily disabled
		// if (this.configurationService) {
		//	await this.configurationService.disconnect();
		//	logger.info('Configuration services disconnected');
		// }

		// Stop Discord client
		if (this.client) {
			await this.client.destroy();
		}

		logger.info('BunkBot stopped');
	}
}

// Main execution
async function main(): Promise<void> {
	let bunkBot: BunkBotContainer | null = null;

	try {
		if (process.env.CI_SMOKE_MODE === 'true') {
			logger.info('CI_SMOKE_MODE enabled: starting minimal health server and skipping Discord login');
			const port = process.env.HEALTH_PORT ? parseInt(process.env.HEALTH_PORT) : 3001;
			const server = createServer((req: IncomingMessage, res: ServerResponse) => {
				if (req.url === '/health') {
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ status: 'healthy', mode: 'smoke', timestamp: new Date().toISOString() }));
					return;
				}
				res.writeHead(404, { 'Content-Type': 'text/plain' });
				res.end('Not Found');
			});
			server.listen(port, () => logger.info(`🏥 [SMOKE] Health server running on port ${port}`));
			const shutdown = (_signal: string) => {
				server.close(() => process.exit(0));
			};
			process.on('SIGINT', () => shutdown('SIGINT'));
			process.on('SIGTERM', () => shutdown('SIGTERM'));
			return;
		}
		bunkBot = new BunkBotContainer();
		await bunkBot.initialize();
		await bunkBot.start();

		// Keep the process alive - the Discord client will handle events
		logger.info('🎯 BunkBot is now running and listening for Discord events...');

		// Set up graceful shutdown handlers
		const shutdown = async (signal: string) => {
			logger.info(`Received ${signal} signal, shutting down BunkBot...`);
			if (bunkBot) {
				try {
					await bunkBot.stop();
					logger.info('BunkBot shutdown completed successfully');
				} catch (error) {
					logger.error('Error during BunkBot shutdown:', ensureError(error));
				}
			}

			// Final cleanup of observability stack
			try {
				const { shutdownObservability } = await import('@starbunk/shared');
				await shutdownObservability();
				logger.info('Observability stack shutdown completed');
			} catch (error) {
				logger.error('Error during observability shutdown:', ensureError(error));
			}

			process.exit(0);
		};

		process.on('SIGINT', () => shutdown('SIGINT'));
		process.on('SIGTERM', () => shutdown('SIGTERM'));

		// Keep process alive indefinitely
		// The Discord client connection will keep the event loop active
	} catch (error) {
		logger.error('Failed to start BunkBot:', ensureError(error));
		if (bunkBot) {
			await bunkBot.stop();
		}
		process.exit(1);
	}
}

// Note: Graceful shutdown is now handled within the main function

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
