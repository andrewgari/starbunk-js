import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client, GatewayIntentBits } from 'discord.js';
import { setupBunkBotLogging } from '@/observability/setup-logging';
import { logger } from '@/observability/logger';
import { BunkBot } from '@/bunkbot';
import { runSmokeTest } from '@starbunk/shared/health/smoke-test';
import { getMetricsService } from '@starbunk/shared/observability/metrics-service';
import { initializeHealthServer } from '@starbunk/shared/health/health-server-init';

// Setup logging mixins before any logging occurs
setupBunkBotLogging();

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
	// Check if running in CI smoke mode
	if (runSmokeTest('bunkbot')) {
		return; // Smoke mode handles its own lifecycle
	}

	// Initialize observability
	logger.withMetadata({
		node_version: process.version,
		platform: process.platform,
		env: process.env.NODE_ENV || 'production',
	}).info('Starting BunkBot...');
	const metricsService = getMetricsService('bunkbot');

	// Start health/metrics server
	const healthServer = await initializeHealthServer();

	// Create and login Discord client
	logger.withMetadata({
		intents: intents.length,
	}).info('Initializing Discord client');
	const client = new Client({ intents });
	const token = process.env.BUNKBOT_TOKEN || process.env.DISCORD_TOKEN;
	if (!token) {
		logger.error('Discord token not found in environment variables');
		throw new Error('BUNKBOT_TOKEN or DISCORD_TOKEN environment variable is required');
	}

	logger.info('Logging in to Discord...');
	await client.login(token);
	logger.withMetadata({
		bot_tag: client.user?.tag,
		bot_id: client.user?.id,
		guilds_count: client.guilds.cache.size,
	}).info('Connected to Discord successfully');

	// Create and initialize BunkBot
	const bunkBot = new BunkBot(client, metricsService, healthServer);
	await bunkBot.initialize();

	// Graceful shutdown
	const shutdown = async (signal: string) => {
		try {
			await bunkBot.shutdown(signal);
			process.exit(0);
		} catch (error) {
			logger.withError(error).error('Error during shutdown');
			process.exit(1);
		}
	};

	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('uncaughtException', (error: Error) => {
	logger.withError(error).withMetadata({
		stack: error.stack,
	}).error('Uncaught exception - process will exit');
	process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
	const error = reason instanceof Error ? reason : new Error(String(reason));
	logger.withError(error).withMetadata({
		reason: String(reason),
	}).error('Unhandled promise rejection - process will exit');
	process.exit(1);
});

if (require.main === module) {
	main().catch((error: Error) => {
		logger.withError(error).withMetadata({
			stack: error.stack,
		}).error('Fatal error during startup - process will exit');
		process.exit(1);
	});
}
