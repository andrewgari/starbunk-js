// BunkBot - Reply bots and admin commands container
import { Events } from 'discord.js';
import type { Message, Interaction } from 'discord.js';

import { logger, ensureError } from '@starbunk/shared';

// Import commands
import pingCommand from './commands/ping';
import debugCommand from './commands/debug';

// Import refactored modules
import { ServiceManager } from './services/ServiceManager';
import { MessageProcessor } from './core/MessageProcessor';
import { BotDiscovery } from './core/BotDiscovery';
import { HealthServer } from './services/HealthServer';
import { InteractionHandler, Command } from './core/InteractionHandler';
import { ReplyBotImpl } from './core/bot-builder';

class BunkBotContainer {
	private serviceManager: ServiceManager;
	private messageProcessor?: MessageProcessor;
	private healthServer: HealthServer;
	private interactionHandler?: InteractionHandler;
	private hasInitialized = false;
	private commands = new Map<string, Command>();
	private replyBots: ReplyBotImpl[] = [];

	constructor() {
		this.serviceManager = ServiceManager.getInstance();
		this.healthServer = new HealthServer();
	}

	async initialize(): Promise<void> {
		logger.info('🚀 Initializing BunkBot container...');

		try {
			await this.serviceManager.initialize();
			await this.initializeReplyBots();
			this.registerCommands();
			this.setupComponents();
			this.setupEventHandlers();
			this.startHealthServer();

			logger.info('✅ BunkBot container initialized successfully');
		} catch (error) {
			logger.error('❌ Failed to initialize BunkBot container:', ensureError(error));
			throw error;
		}
	}

	private async initializeReplyBots(): Promise<void> {
		logger.info('🤖 Initializing reply bot system...');

		try {
			const discovery = new BotDiscovery();
			const _result = await discovery.discoverBots();

			this.replyBots = result.bots;

			if (this.replyBots.length > 0) {
				logger.info(`✅ Loaded ${this.replyBots.length} reply bots`);
				this.replyBots.forEach((bot) => {
					logger.info(`   - ${bot.name}: ${bot.description}`);
				});
			} else {
				logger.warn('⚠️  No reply bots loaded - only slash commands are active');
			}
		} catch (error) {
			logger.error('❌ Failed to initialize reply bot system:', ensureError(error));
			this.replyBots = [];
		}
	}

	private registerCommands(): void {
		this.commands.set('ping', pingCommand);
		this.commands.set('debug', debugCommand);
		logger.info(`Registered ${this.commands.size} commands: ${Array.from(this.commands.keys()).join(', ')}`);
	}

	private setupComponents(): void {
		const messageFilter = this.serviceManager.getMessageFilter();

		this.messageProcessor = new MessageProcessor(messageFilter, this.replyBots);
		this.interactionHandler = new InteractionHandler(messageFilter, this.commands);
	}

	private async deployCommands(): Promise<void> {
		try {
			const client = this.serviceManager.getClient();
			logger.info('🚀 Deploying slash commands to Discord...');

			const commandData = Array.from(this.commands.values()).map((command) => command.data);
			logger.info(`📋 Commands to deploy: ${commandData.map((cmd) => cmd.name).join(', ')}`);

			const guildId = process.env.GUILD_ID;
			if (guildId && process.env.DEBUG_MODE === 'true') {
				logger.info(`🎯 Deploying commands to guild ${guildId} (debug mode)`);
				const guild = await client.guilds.fetch(guildId);
				await guild.commands.set(commandData);
			} else {
				logger.info('🌍 Deploying commands globally');
				await client.application!.commands.set(commandData);
			}

			logger.info(`✅ Successfully deployed ${commandData.length} slash commands`);
		} catch (error) {
			logger.error('❌ Failed to deploy commands:', ensureError(error));
			throw error;
		}
	}

	private startHealthServer(): void {
		this.healthServer.start(() => {
			const memory = process.memoryUsage();
			return {
				status: 'healthy',
				timestamp: new Date().toISOString(),
				discord: {
					connected: this.serviceManager.getClient()?.isReady() || false,
					initialized: this.hasInitialized,
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
						status: this.serviceManager.getClient()?.isReady() || false ? 'healthy' : 'unhealthy',
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
		const client = this.serviceManager.getClient();

		client.on(Events.Error, (error: Error) => {
			logger.error('Discord client error:', error);
		});

		client.on(Events.Warn, (warning: string) => {
			logger.warn('Discord client warning:', warning);
		});

		client.on(Events.MessageCreate, async (message: Message) => {
			logger.debug(`Message from ${message.author?.username}: "${message.content?.substring(0, 50)}"`);
			await this.messageProcessor?.processMessage(message);
		});

		client.on(Events.InteractionCreate, async (interaction: Interaction) => {
			if (!interaction.isChatInputCommand()) return;
			logger.debug(`Interaction: ${interaction.commandName} from ${interaction.user?.username}`);
			await this.interactionHandler?.handleInteraction(interaction);
		});

		client.once(Events.ClientReady, async () => {
			logger.info('🤖 BunkBot is ready and connected to Discord');
			await this.validateGuildPresence();
			await this.deployCommands();
			this.hasInitialized = true;
		});
	}

	private async validateGuildPresence(): Promise<void> {
		const guildId = process.env.GUILD_ID;
		if (!guildId) return;

		try {
			const client = this.serviceManager.getClient();
			const guild = await client.guilds.fetch(guildId);
			logger.info(`✅ Bot present in guild: ${guild.name} (${guild.id})`);
		} catch (error) {
			logger.error(`❌ Bot not in guild ${guildId}:`, ensureError(error));
			logger.error('🚨 Bot needs to be invited to Discord server');
		}
	}

	async start(): Promise<void> {
		const token = this.getDiscordToken();
		this.logTokenSource();

		const client = this.serviceManager.getClient();
		await client.login(token);
		await this.waitForReady();
		logger.info('🎉 BunkBot started successfully');
	}

	private getDiscordToken(): string {
		const token = process.env.BUNKBOT_TOKEN || process.env.STARBUNK_TOKEN || process.env.TOKEN;

		if (!token) {
			throw new Error('No Discord token found. Set BUNKBOT_TOKEN, STARBUNK_TOKEN, or TOKEN');
		}

		return token;
	}

	private logTokenSource(): void {
		if (process.env.BUNKBOT_TOKEN) {
			logger.info('🔑 Using BUNKBOT_TOKEN for authentication');
		} else if (process.env.STARBUNK_TOKEN) {
			logger.info('🔑 Using STARBUNK_TOKEN for authentication');
		} else {
			logger.info('🔑 Using TOKEN for authentication');
		}
	}

	private waitForReady(): Promise<void> {
		return new Promise((resolve) => {
			if (this.hasInitialized) {
				resolve();
			} else {
				this.serviceManager.getClient().once(Events.ClientReady, () => resolve());
			}
		});
	}

	async stop(): Promise<void> {
		logger.info('Stopping BunkBot...');

		await this.healthServer.stop();

		const client = this.serviceManager.getClient();
		if (client) {
			await client.destroy();
		}

		logger.info('BunkBot stopped');
	}
}

async function main(): Promise<void> {
	let bunkBot: BunkBotContainer | null = null;

	try {
		bunkBot = new BunkBotContainer();
		await bunkBot.initialize();
		await bunkBot.start();

		logger.info('🎯 BunkBot is now running and listening for Discord events...');

		const shutdown = async (signal: string) => {
			logger.info(`Received ${signal} signal, shutting down BunkBot...`);
			if (bunkBot) {
				await bunkBot.stop();
			}
			process.exit(0);
		};

		process.on('SIGINT', () => shutdown('SIGINT'));
		process.on('SIGTERM', () => shutdown('SIGTERM'));
	} catch (error) {
		logger.error('Failed to start BunkBot:', ensureError(error));
		if (bunkBot) {
			await bunkBot.stop();
		}
		process.exit(1);
	}
}

if (require.main === module) {
	main().catch((error) => {
		console.error('Fatal error:', ensureError(error));
		process.exit(1);
	});
}
