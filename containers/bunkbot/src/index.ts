// BunkBot - Reply bots and admin commands container
import { Events } from 'discord.js';
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
	runStartupDiagnostics
} from '@starbunk/shared';

// Import DiscordService directly from the service file
import { DiscordService } from '@starbunk/shared/dist/services/discordService';

// Import commands
import pingCommand from './commands/ping';
import debugCommand from './commands/debug';

// Import reply bot system
import { BotRegistry } from './botRegistry';
// import { DatabaseBotFactory } from './core/database-bot-factory'; // Temporarily disabled
import ReplyBot from './replyBot';

class BunkBotContainer {
	private client: any;
	private webhookManager!: WebhookManager;
	private messageFilter!: MessageFilter;
	private hasInitialized = false;
	private commands = new Map();
	private healthServer: any;
	private replyBots: ReplyBot[] = [];

	async initialize(): Promise<void> {
		logger.info('🚀 Initializing BunkBot container...');

		try {
			// Run startup diagnostics
			const diagnostics = await runStartupDiagnostics();
			const failures = diagnostics.filter(d => d.status === 'fail');

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
			required: ['STARBUNK_TOKEN'],
			optional: ['DATABASE_URL', 'DEBUG_MODE', 'TESTING_SERVER_IDS', 'TESTING_CHANNEL_IDS', 'NODE_ENV']
		});
	}

	private async initializeServices(): Promise<void> {
		// Register Discord client
		container.register(ServiceId.DiscordClient, this.client);

		// Initialize and register Discord service for bot identity functionality
		const discordService = new DiscordService(this.client);
		// Use the same approach as the bootstrap function
		container.register(
			ServiceId.DiscordService,
			discordService
		);
		logger.info('✅ Discord identity service initialized and registered');

		// Initialize webhook manager
		this.webhookManager = new WebhookManager(this.client);
		container.register(ServiceId.WebhookService, this.webhookManager);

		// Initialize message filter
		this.messageFilter = getMessageFilter();
		container.register(ServiceId.MessageFilter, this.messageFilter);

		// Database services temporarily disabled to focus on file-based bot loading
		logger.info('⚠️  Database services disabled - using file-based bot loading only');

		logger.info('BunkBot services initialized');
	}

	private async initializeReplyBots(): Promise<void> {
		logger.info('🤖 Initializing reply bot system...');

		try {
			// For now, focus on file-based bot loading only
			// Database bot loading is temporarily disabled to fix compilation issues
			logger.info('📁 Loading reply bots from file system...');
			this.replyBots = await BotRegistry.discoverBots();

			if (this.replyBots.length > 0) {
				logger.info(`✅ Reply bot system initialized with ${this.replyBots.length} bots`);
				logger.info('🤖 Active reply bots:');
				this.replyBots.forEach(bot => {
					logger.info(`   - ${bot.defaultBotName}: ${bot.description}`);
				});
			} else {
				logger.warn('⚠️  No reply bots were loaded - only slash commands are active');
			}
		} catch (error) {
			logger.error('❌ Failed to initialize reply bot system:', ensureError(error));
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
		const commandData = Array.from(this.commands.values()).map(command => command.data);
		logger.info(`📋 Commands to deploy: ${commandData.map(cmd => cmd.name).join(', ')}`);

		// Deploy commands to specific guild for faster updates during development
		const guildId = process.env.GUILD_ID;
		if (guildId && process.env.DEBUG_MODE === 'true') {
			logger.info(`🎯 Deploying commands to guild ${guildId} (debug mode)`);
			const guild = await this.client.guilds.fetch(guildId);
			await guild.commands.set(commandData);
		} else {
			// Deploy commands globally (available in all servers)
			logger.info('🌍 Deploying commands globally');
			await this.client.application.commands.set(commandData);
		}

		logger.info(`✅ Successfully deployed ${commandData.length} slash commands to Discord`);
	} catch (error) {
		logger.error('❌ Failed to deploy commands to Discord:', ensureError(error));
		throw error;
	}
}

	private startHealthServer(): void {
		this.healthServer = createServer((req: IncomingMessage, res: ServerResponse) => {
			if (req.url === '/health') {
				const healthStatus = {
					status: 'healthy',
					timestamp: new Date().toISOString(),
					discord: {
						connected: this.client?.isReady() || false,
						initialized: this.hasInitialized
					},
					uptime: process.uptime()
				};

				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify(healthStatus, null, 2));
			} else {
				res.writeHead(404, { 'Content-Type': 'text/plain' });
				res.end('Not Found');
			}
		});

		const port = process.env.HEALTH_PORT ? parseInt(process.env.HEALTH_PORT) : 3002;
		this.healthServer.listen(port, () => {
			logger.info(`🏥 Health check server running on port ${port}`);
		});
	}

	private setupEventHandlers(): void {
		this.client.on(Events.Error, (error: Error) => {
			logger.error('Discord client error:', error);
		});

		this.client.on(Events.Warn, (warning: string) => {
			logger.warn('Discord client warning:', warning);
		});

		this.client.on(Events.MessageCreate, async (message: any) => {
			logger.debug(`💬 Received message from ${message.author?.username || 'unknown'}: ${message.content?.substring(0, 50) || 'no content'}...`);
			await this.handleMessage(message);
		});

		this.client.on(Events.InteractionCreate, async (interaction: any) => {
			logger.info(`🎮 Received interaction: ${interaction.type} from ${interaction.user?.username || 'unknown'} - Command: ${interaction.commandName || 'N/A'}`);
			logger.info(`🔍 Interaction details: Guild=${interaction.guildId}, Channel=${interaction.channelId}, User=${interaction.user?.id}`);
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
					logger.info(`🔍 Bot permissions in guild: ${guild.members.me?.permissions.toArray().join(', ') || 'Unknown'}`);
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

	private async handleMessage(message: any): Promise<void> {
		// Skip bot messages
		if (message.author.bot) return;

		try {
			// Create message context for filtering
			const context = MessageFilter.createContextFromMessage(message);

			// Check if message should be processed
			const filterResult = this.messageFilter.shouldProcessMessage(context);
			if (!filterResult.allowed) {
				// Message was filtered out - no need to log unless in debug mode
				if (this.messageFilter.isDebugMode()) {
					logger.debug(`Message filtered: ${filterResult.reason}`);
				}
				return;
			}

			logger.debug(`Processing message from ${message.author.username}: ${message.content}`);

			// Process message through reply bot system
			await this.processMessageWithReplyBots(message);

		} catch (error) {
			logger.error('Error processing message:', ensureError(error));
		}
	}

	/**
	 * Process a message through all loaded reply bots
	 * @param message Discord message to process
	 */
	private async processMessageWithReplyBots(message: any): Promise<void> {
		if (this.replyBots.length === 0) {
			logger.debug('No reply bots loaded - skipping message processing');
			return;
		}

		logger.debug(`Processing message through ${this.replyBots.length} reply bots`);

		// Process message through each reply bot
		for (const bot of this.replyBots) {
			try {
				// Check if bot should respond to this message
				const shouldRespond = await bot.shouldRespond(message);

				if (shouldRespond) {
					logger.debug(`${bot.defaultBotName} will process message`);
					await bot.processMessagePublic(message);
				} else {
					logger.debug(`${bot.defaultBotName} skipped message`);
				}
			} catch (error) {
				logger.error(`Error processing message with ${bot.defaultBotName}:`, ensureError(error));
				// Continue processing with other bots even if one fails
			}
		}
	}

	private async handleInteraction(interaction: any): Promise<void> {
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
							ephemeral: true
						});
					} else {
						// Silently ignore in production mode
						await interaction.reply({
							content: '🚫 This command is not available in this server/channel.',
							ephemeral: true
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
						content: `❓ Unknown command: \`${commandName}\`\nAvailable commands: ${Array.from(this.commands.keys()).map(cmd => `\`${cmd}\``).join(', ')}`,
						ephemeral: true
					});
				}

			} catch (error) {
				logger.error(`Error processing command ${interaction.commandName}:`, ensureError(error));

				// Send error response if interaction hasn't been replied to
				try {
					if (!interaction.replied && !interaction.deferred) {
						await interaction.reply({
							content: '❌ An error occurred while processing the command.',
							ephemeral: true
						});
					}
				} catch (replyError) {
					logger.error('Failed to send error response:', ensureError(replyError));
				}
			}
		}
	}

	async start(): Promise<void> {
		// Check for container-specific token first, then fallback to legacy tokens
		const token = process.env.BUNKBOT_TOKEN || process.env.STARBUNK_TOKEN || process.env.TOKEN;

		if (!token) {
			throw new Error('No Discord token found. Please set BUNKBOT_TOKEN, STARBUNK_TOKEN, or TOKEN environment variable.');
		}

		// Log which token variable is being used (without exposing the actual token)
		if (process.env.BUNKBOT_TOKEN) {
			logger.info('🔑 Using BUNKBOT_TOKEN for Discord authentication');
		} else if (process.env.STARBUNK_TOKEN) {
			logger.info('🔑 Using STARBUNK_TOKEN for Discord authentication (fallback)');
		} else {
			logger.info('🔑 Using TOKEN for Discord authentication (last resort)');
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

		// Stop health server
		if (this.healthServer) {
			this.healthServer.close(() => {
				logger.info('Health server stopped');
			});
		}

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
		bunkBot = new BunkBotContainer();
		await bunkBot.initialize();
		await bunkBot.start();

		// Keep the process alive - the Discord client will handle events
		logger.info('🎯 BunkBot is now running and listening for Discord events...');

		// Set up graceful shutdown handlers
		const shutdown = async (signal: string) => {
			logger.info(`Received ${signal} signal, shutting down BunkBot...`);
			if (bunkBot) {
				await bunkBot.stop();
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

if (require.main === module) {
	main().catch(error => {
		console.error('Fatal error:', ensureError(error));
		process.exit(1);
	});
}
