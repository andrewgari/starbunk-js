// BunkBot - Reply bots and admin commands container (Enhanced Debug Version)
import { Events } from 'discord.js';
import { 
	logger, 
	ensureError, 
	validateEnvironment, 
	createDiscordClient, 
	ClientConfigs,
	container,
	ServiceId,
	WebhookManager 
} from '@starbunk/shared';

class BunkBotContainer {
	private client: any;
	private webhookManager!: WebhookManager;
	private hasInitialized = false;
	private messageCount = 0;

	async initialize(): Promise<void> {
		logger.info('🤖 Initializing BunkBot container...');

		try {
			// Validate environment
			this.validateEnvironment();

			// Create Discord client
			this.client = createDiscordClient(ClientConfigs.BunkBot);

			// Initialize services
			await this.initializeServices();

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
			optional: ['DATABASE_URL', 'DEBUG', 'NODE_ENV']
		});
		logger.info('✅ Environment validation passed for BunkBot');
	}

	private async initializeServices(): Promise<void> {
		// Register Discord client
		container.register(ServiceId.DiscordClient, this.client);

		// Initialize webhook manager for reply bots
		this.webhookManager = new WebhookManager(this.client);
		container.register(ServiceId.WebhookService, this.webhookManager);

		// Initialize database if URL is provided
		if (process.env.DATABASE_URL) {
			logger.info('✅ Database connection available for reply bot data');
		} else {
			logger.info('ℹ️  No database URL provided, reply bots will work without persistence');
		}

		logger.info('✅ BunkBot services initialized');
	}

	private setupEventHandlers(): void {
		this.client.on(Events.Error, (error: Error) => {
			logger.error('Discord client error:', error);
		});

		this.client.on(Events.Warn, (warning: string) => {
			logger.warn('Discord client warning:', warning);
		});

		// Enhanced message event handler with debug logging
		this.client.on(Events.MessageCreate, async (message: any) => {
			this.messageCount++;
			logger.debug(`🔔 Message event received (#${this.messageCount})`);
			logger.debug(`   Author: ${message.author?.username || 'unknown'} (Bot: ${message.author?.bot || false})`);
			logger.debug(`   Content: "${message.content || 'no content'}"`);
			logger.debug(`   Channel: ${message.channel?.id || 'unknown'}`);
			logger.debug(`   Guild: ${message.guild?.id || 'DM'}`);
			
			await this.handleMessage(message);
		});

		this.client.on(Events.InteractionCreate, async (interaction: any) => {
			logger.debug('🔔 Interaction event received');
			logger.debug(`   Type: ${interaction.type}`);
			logger.debug(`   User: ${interaction.user?.username || 'unknown'}`);
			
			await this.handleInteraction(interaction);
		});

		// Log all Discord events for debugging
		this.client.on('raw', (packet: any) => {
			if (packet.t === 'MESSAGE_CREATE') {
				logger.debug(`🔍 Raw MESSAGE_CREATE event received`);
			}
		});

		this.client.once(Events.ClientReady, () => {
			logger.info('🤖 BunkBot is ready and connected to Discord');
			logger.info(`   Bot user: ${this.client.user?.tag}`);
			logger.info(`   Guild count: ${this.client.guilds.cache.size}`);
			logger.info(`   Intents: ${this.client.options.intents.bitfield}`);
			this.hasInitialized = true;
		});

		// Log when bot joins/leaves guilds
		this.client.on(Events.GuildCreate, (guild: any) => {
			logger.info(`🏰 Joined guild: ${guild.name} (${guild.id})`);
		});

		this.client.on(Events.GuildDelete, (guild: any) => {
			logger.info(`🚪 Left guild: ${guild.name} (${guild.id})`);
		});
	}

	private async handleMessage(message: any): Promise<void> {
		logger.debug('📨 Processing message in handleMessage()');
		
		// Skip bot messages
		if (message.author.bot) {
			logger.debug('   ⏭️  Skipping bot message');
			return;
		}

		try {
			logger.debug('   🔍 Checking for "hello bunkbot" trigger');
			
			// Demo: Simple reply bot functionality
			if (message.content.toLowerCase().includes('hello bunkbot')) {
				logger.info('🎯 "hello bunkbot" trigger detected! Sending response...');
				
				const response = {
					content: `Hello ${message.author.username}! BunkBot is working! 🤖`,
					username: 'BunkBot',
					avatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png'
				};
				
				logger.debug(`   📤 Sending webhook message: ${JSON.stringify(response)}`);
				
				await this.webhookManager.sendMessage(message.channel.id, response);
				
				logger.info('✅ Response sent successfully');
			} else {
				logger.debug('   ❌ No trigger found in message');
			}
		} catch (error) {
			logger.error('Error processing message:', ensureError(error));
		}
	}

	private async handleInteraction(interaction: any): Promise<void> {
		if (interaction.isChatInputCommand()) {
			try {
				logger.debug(`🎮 Processing slash command: ${interaction.commandName}`);
				
				// Demo: Simple admin command
				if (interaction.commandName === 'ping') {
					logger.info('🏓 Ping command detected! Sending pong...');
					await interaction.reply('Pong! BunkBot is operational! 🏓');
					logger.info('✅ Pong response sent');
				}
			} catch (error) {
				logger.error('Error processing interaction:', ensureError(error));
			}
		}
	}

	async start(): Promise<void> {
		const token = process.env.STARBUNK_TOKEN;
		if (!token) {
			throw new Error('STARBUNK_TOKEN environment variable is required');
		}

		logger.info('🔐 Logging in to Discord...');
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
