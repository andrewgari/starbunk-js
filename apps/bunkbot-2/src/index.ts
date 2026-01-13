import * as dotenv from 'dotenv';
import * as path from 'path';
import { BotDiscoveryService } from './reply-bots/services/bot-discovery-service';
import { YamlBotFactory } from './serialization/yaml-bot-factory';
import { BotRegistry } from './reply-bots/bot-registry';
import { Client, GatewayIntentBits, Message } from 'discord.js';
import { DiscordService } from './discord/discord-service';
import { getHealthServer } from './observability/health-server';
import { getMetricsService } from './observability/metrics-service';
import { logger } from './observability/logger';

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const intents = [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent,
	GatewayIntentBits.GuildMembers,
	GatewayIntentBits.GuildWebhooks,
];

async function main() {
	// Initialize observability
	logger.info('Starting BunkBot-2...', {
		node_version: process.version,
		platform: process.platform,
		env: process.env.NODE_ENV || 'production',
	});
	const metricsService = getMetricsService();

	// Start health/metrics server
	const metricsPort = parseInt(process.env.METRICS_PORT || '3000', 10);
	logger.info('Starting health and metrics server', { port: metricsPort });
	const healthServer = getHealthServer(metricsPort);
	await healthServer.start();
	logger.info('Health and metrics server started successfully', {
		port: metricsPort,
		endpoints: ['/health', '/ready', '/live', '/metrics'],
	});

	// Create and login Discord client first
	logger.info('Initializing Discord client', {
		intents: intents.length,
	});
	const client = new Client({ intents });
	const token = process.env.BUNKBOT_TOKEN || process.env.DISCORD_TOKEN;
	if (!token) {
		logger.error('Discord token not found in environment variables');
		throw new Error('BUNKBOT_TOKEN or DISCORD_TOKEN environment variable is required');
	}

	logger.info('Logging in to Discord...');
	await client.login(token);
	logger.info('Connected to Discord successfully', {
		bot_tag: client.user?.tag,
		bot_id: client.user?.id,
		guilds_count: client.guilds.cache.size,
	});

	// Initialize Discord service with the client
	const discordService = DiscordService.getInstance();
	discordService.setClient(client);

	// Now load bots (they can use the Discord service)
	const botsDir = process.env.BUNKBOT_BOTS_DIR || path.join(__dirname, '../../../config/bots');
	logger.info('Starting bot discovery', { directory: botsDir });

	const registry = new BotRegistry();
	const factory = new YamlBotFactory();
	const discovery = new BotDiscoveryService(factory, registry);
	await discovery.discover(botsDir);

	// Update active bots metric
	const botCount = registry.getBots().length;
	metricsService.setActiveBots(botCount);
	logger.info('Bot discovery complete', {
		total_bots: botCount,
		bot_names: registry.getBots().map(b => b.name).join(', '),
	});

	// Set up message handler
	logger.info('Registering Discord event handlers');
	client.on('messageCreate', async (message: Message) => {
		// Track message processing
		if (message.guildId && message.channelId) {
			metricsService.trackMessageProcessed(message.guildId, message.channelId);
		}

		await registry.processmessage(message);
	});

	// Log when bot joins/leaves guilds
	client.on('guildCreate', (guild) => {
		logger.info('Bot added to new guild', {
			guild_id: guild.id,
			guild_name: guild.name,
			member_count: guild.memberCount,
		});
	});

	client.on('guildDelete', (guild) => {
		logger.info('Bot removed from guild', {
			guild_id: guild.id,
			guild_name: guild.name,
		});
	});

	// Log errors
	client.on('error', (error) => {
		logger.error('Discord client error', error);
	});

	client.on('warn', (warning) => {
		logger.warn('Discord client warning', { warning });
	});

	logger.info('BunkBot-2 is now running and listening for Discord events', {
		guilds: client.guilds.cache.size,
		active_bots: botCount,
	});

	// Graceful shutdown
	const shutdown = async (signal: string) => {
		logger.info(`Received ${signal}, shutting down gracefully...`, { signal });

		try {
			logger.info('Stopping health server...');
			await healthServer.stop();
			logger.info('Health server stopped');

			logger.info('Destroying Discord client...');
			await client.destroy();
			logger.info('Discord client destroyed');

			logger.info('Shutdown complete');
			process.exit(0);
		} catch (error) {
			logger.error('Error during shutdown', error);
			process.exit(1);
		}
	};

	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('uncaughtException', (error: Error) => {
	logger.error('Uncaught exception - process will exit', error, {
		stack: error.stack,
	});
	process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
	logger.error('Unhandled promise rejection - process will exit', reason instanceof Error ? reason : new Error(String(reason)), {
		reason: String(reason),
	});
	process.exit(1);
});

if (require.main === module) {
	main().catch((error: Error) => {
		logger.error('Fatal error during startup - process will exit', error, {
			stack: error.stack,
		});
		process.exit(1);
	});
}
