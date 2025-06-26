// BunkBot - Reply bots and admin commands container
import { Events } from 'discord.js';
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

// Import commands
import pingCommand from './commands/ping';
import debugCommand from './commands/debug';

class BunkBotContainer {
	private client: any;
	private webhookManager: WebhookManager;
	private messageFilter: MessageFilter;
	private hasInitialized = false;
	private commands = new Map();

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

		// Register commands
		this.registerCommands();

			// Set up event handlers
			this.setupEventHandlers();

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

		// Initialize webhook manager
		this.webhookManager = new WebhookManager(this.client);
		container.register(ServiceId.WebhookService, this.webhookManager);

		// Initialize message filter
		this.messageFilter = getMessageFilter();
		container.register(ServiceId.MessageFilter, this.messageFilter);

		// Initialize database if URL is provided
		if (process.env.DATABASE_URL) {
			// TODO: Initialize Prisma client for reply bot data
			logger.info('Database connection available for reply bot data');
		}

		logger.info('BunkBot services initialized');
	}

private registerCommands(): void {
	// Register available commands
	this.commands.set('ping', pingCommand);
	this.commands.set('debug', debugCommand);

	logger.info(`Registered ${this.commands.size} commands: ${Array.from(this.commands.keys()).join(', ')}`);
}

	private setupEventHandlers(): void {
		this.client.on(Events.Error, (error: Error) => {
			logger.error('Discord client error:', error);
		});

		this.client.on(Events.Warn, (warning: string) => {
			logger.warn('Discord client warning:', warning);
		});

		this.client.on(Events.MessageCreate, async (message: any) => {
			await this.handleMessage(message);
		});

		this.client.on(Events.InteractionCreate, async (interaction: any) => {
			await this.handleInteraction(interaction);
		});

		this.client.once(Events.ClientReady, () => {
			logger.info('🤖 BunkBot is ready and connected to Discord');
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

			// Demo: Simple reply bot functionality
			if (message.content.toLowerCase().includes('hello bunkbot')) {
				logger.info(`🎯 "hello bunkbot" trigger detected from ${message.author.username}`);

				await this.webhookManager.sendMessage(message.channel.id, {
					content: `Hello ${message.author.username}! BunkBot is working! 🤖`,
					username: 'BunkBot',
					avatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png'
				});

				logger.info('✅ BunkBot response sent successfully');
			}

			// TODO: Add more reply bot patterns here
			// This is where we'll integrate the full reply bot system

		} catch (error) {
			logger.error('Error processing message:', ensureError(error));
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
		const token = process.env.STARBUNK_TOKEN;
		if (!token) {
			throw new Error('STARBUNK_TOKEN environment variable is required');
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
		if (this.client) {
			await this.client.destroy();
		}
		logger.info('BunkBot stopped');
	}

}

// Main execution
async function main(): Promise<void> {
	try {
		const bunkBot = new BunkBotContainer();
		await bunkBot.initialize();
		await bunkBot.start();
	} catch (error) {
		logger.error('Failed to start BunkBot:', ensureError(error));
		process.exit(1);
	}
}

// Graceful shutdown
process.on('SIGINT', async () => {
	logger.info('Received SIGINT signal, shutting down BunkBot...');
	process.exit(0);
});

process.on('SIGTERM', async () => {
	logger.info('Received SIGTERM signal, shutting down BunkBot...');
	process.exit(0);
});

if (require.main === module) {
	main().catch(error => {
		console.error('Fatal error:', ensureError(error));
		process.exit(1);
	});
}
