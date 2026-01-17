import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client, GatewayIntentBits } from 'discord.js';
import { getMetricsService } from '@starbunk/shared/observability/metrics-service';
import { logger } from '@starbunk/shared/observability/logger';
import { runSmokeMode } from '@starbunk/shared/health/smoke-mode';
import { initializeHealthServer } from '@starbunk/shared/health/health-server-init';
import { BunkBot } from '@/bunkbot';

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
	if (runSmokeMode()) {
		return; // Smoke mode handles its own lifecycle
	}

	// Initialize observability
	logger.info('Starting BunkBot...', {
		node_version: process.version,
		platform: process.platform,
		env: process.env.NODE_ENV || 'production',
	});
	const metricsService = getMetricsService();

	// Start health/metrics server
	const healthServer = await initializeHealthServer();

	// Create and login Discord client
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

	// Create and initialize BunkBot
	const bunkBot = new BunkBot(client, metricsService, healthServer);
	await bunkBot.initialize();

	// Graceful shutdown
	const shutdown = async (signal: string) => {
		try {
			await bunkBot.shutdown(signal);
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
