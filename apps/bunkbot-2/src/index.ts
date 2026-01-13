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
	logger.info('Starting BunkBot-2...');
	const metricsService = getMetricsService();

	// Start health/metrics server
	const metricsPort = parseInt(process.env.METRICS_PORT || '3000', 10);
	const healthServer = getHealthServer(metricsPort);
	await healthServer.start();
	logger.info(`Health and metrics server started on port ${metricsPort}`);

	// Create and login Discord client first
	const client = new Client({ intents });
	const token = process.env.BUNKBOT_TOKEN || process.env.DISCORD_TOKEN;
	if (!token) {
		throw new Error('BUNKBOT_TOKEN or DISCORD_TOKEN environment variable is required');
	}
	await client.login(token);
	logger.info(`Connected to Discord as ${client.user?.tag}`);

	// Initialize Discord service with the client
	const discordService = DiscordService.getInstance();
	discordService.setClient(client);

	// Now load bots (they can use the Discord service)
	const botsDir = process.env.BUNKBOT_BOTS_DIR || path.join(__dirname, '../../../config/bots');
	logger.info(`Loading bots from: ${botsDir}`);

	const registry = new BotRegistry();
	const factory = new YamlBotFactory();
	const discovery = new BotDiscoveryService(factory, registry);
	discovery.discover(botsDir);

	// Update active bots metric
	const botCount = registry.getBots().length;
	metricsService.setActiveBots(botCount);
	logger.info(`Loaded ${botCount} bots`);

	client.on('messageCreate', async (message: Message) => {
		// Track message processing
		if (message.guildId && message.channelId) {
			metricsService.trackMessageProcessed(message.guildId, message.channelId);
		}

		await registry.processmessage(message);
	});

	logger.info('BunkBot-2 is now running and listening for Discord events');

	// Graceful shutdown
	const shutdown = async (signal: string) => {
		logger.info(`Received ${signal}, shutting down gracefully...`);
		await healthServer.stop();
		await client.destroy();
		process.exit(0);
	};

	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('uncaughtException', (error: Error) => {
	console.error('Uncaught exception:', error);
	process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
	console.error('Unhandled promise rejection:', reason);
	process.exit(1);
});

if (require.main === module) {
	main().catch((error: Error) => {
    console.error('Fatal error:', error);
		process.exit(1);
	});
}
