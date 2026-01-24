import * as path from 'path';
import { Client, Message } from 'discord.js';
import { BotDiscoveryService } from '@/reply-bots/services/bot-discovery-service';
import { YamlBotFactory } from '@/serialization/yaml-bot-factory';
import { BotRegistry } from '@/reply-bots/bot-registry';
import { DiscordService } from '@starbunk/shared/discord/discord-service';
import { MetricsService } from '@starbunk/shared/observability/metrics-service';
import { HealthServer } from '@starbunk/shared/observability/health-server';
import { shutdownObservability } from '@starbunk/shared/observability/shutdown';
import { logger } from '@/observability/logger';
import { initializeCommands } from '@starbunk/shared/discord/command-registry';
import { commands } from '@/commands';

/**
 * Main BunkBot application class
 * Encapsulates all bot state and lifecycle management
 */
export class BunkBot {
	private client: Client;
	private metricsService: MetricsService;
	private healthServer: HealthServer;
	private botRegistry: BotRegistry;
	private discordService: DiscordService;

	constructor(client: Client, metricsService: MetricsService, healthServer: HealthServer) {
		this.client = client;
		this.metricsService = metricsService;
		this.healthServer = healthServer;
		this.botRegistry = new BotRegistry();
		this.discordService = DiscordService.getInstance();
	}

	/**
	 * Initialize the bot: discover bots, set up commands, and register event handlers
	 */
	async initialize(): Promise<void> {
		// Initialize Discord service with the client
		this.discordService.setClient(this.client);

		// Discover and load bots
		await this.discoverBots();

		// Initialize commands
		await initializeCommands(this.client, commands);

		// Set up event handlers
		this.setupMessageHandler();
		this.setupGuildEventHandlers();
		this.setupErrorHandlers();

		const botCount = this.botRegistry.getBots().length;
		logger.withMetadata({
			guilds: this.client.guilds.cache.size,
			active_bots: botCount,
		}).info('BunkBot is now running and listening for Discord events');
	}

	/**
	 * Discover and load bots from the configured directory
	 */
	private async discoverBots(): Promise<void> {
		const botsDir = process.env.BUNKBOT_BOTS_DIR || '/app/config';
		logger.withMetadata({ directory: botsDir }).info('Starting bot discovery');

		BotRegistry.setInstance(this.botRegistry); // Make registry accessible globally
		const factory = new YamlBotFactory();
		const discovery = new BotDiscoveryService(factory, this.botRegistry);
		await discovery.discover(botsDir);

		// Update active bots metric
		const botCount = this.botRegistry.getBots().length;
		this.metricsService.setActiveBots(botCount);
		logger.withMetadata({
			total_bots: botCount,
			bot_names: this.botRegistry.getBots().map(b => b.name).join(', '),
		}).info('Bot discovery complete');
	}

	/**
	 * Set up message handler for bot triggers
	 */
	private setupMessageHandler(): void {
		logger.info('Registering message event handler');
		this.client.on('messageCreate', async (message: Message) => {
			// Track message processing
			if (message.guildId && message.channelId) {
				this.metricsService.trackMessageProcessed(message.guildId, message.channelId);
			}

			await this.botRegistry.processMessage(message);
		});
	}

	/**
	 * Set up guild event handlers (join/leave)
	 */
	private setupGuildEventHandlers(): void {
		this.client.on('guildCreate', (guild) => {
			logger.withMetadata({
				guild_id: guild.id,
				guild_name: guild.name,
				member_count: guild.memberCount,
			}).info('Bot added to new guild');
		});

		this.client.on('guildDelete', (guild) => {
			logger.withMetadata({
				guild_id: guild.id,
				guild_name: guild.name,
			}).info('Bot removed from guild');
		});
	}

	/**
	 * Set up error and warning handlers
	 */
	private setupErrorHandlers(): void {
		this.client.on('error', (error) => {
			logger.withError(error).error('Discord client error');
		});

		this.client.on('warn', (warning) => {
			logger.withMetadata({ warning }).warn('Discord client warning');
		});
	}

	/**
	 * Gracefully shutdown the bot
	 */
	async shutdown(signal: string): Promise<void> {
		logger.withMetadata({ signal }).info(`Received ${signal}, shutting down gracefully...`);

		try {
			logger.info('Stopping health server...');
			await this.healthServer.stop();
			logger.info('Health server stopped');

			logger.info('Destroying Discord client...');
			await this.client.destroy();
			logger.info('Discord client destroyed');

			logger.info('Flushing observability data...');
			await shutdownObservability(process.env.SERVICE_NAME || 'bunkbot');

			// Use stderr for final messages since logger is shut down
			process.stderr.write('[BunkBot] Observability data flushed\n');
			process.stderr.write('[BunkBot] Shutdown complete\n');
		} catch (error) {
			logger.withError(error).error('Error during shutdown');
			throw error;
		}
	}
}

