import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { logger } from '@/observability/logger';
import { BlueBot } from '@/blue-bot';
import { runSmokeTest } from '@starbunk/shared/health/smoke-test';

const intents = [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent,
	// GatewayIntentBits.GuildWebhooks,
];

async function main(): Promise<void> {
	// CI smoke mode: lightweight health endpoint without Discord login
	if (process.env.CI_SMOKE_MODE === 'true') {
		runSmokeTest('bluebot');
		return;
	}

	const token = process.env.DISCORD_TOKEN;

	if (!token) {
		logger.error('Discord token not found in environment variables');
		throw new Error('DISCORD_TOKEN environment variable is required');
	}

	const client = new Client({ intents });

	logger.info('Logging in to Discord...');
	await client.login(token);
	logger.info('BlueBot connected to Discord');

	const bot = new BlueBot(client);
	await bot.start();

	// Set up graceful shutdown handlers
	const shutdown = (signal: string) => {
		logger.info(`Received ${signal}, shutting down gracefully...`);
		client.destroy();
		process.exit(0);
	};

	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));
}

if (require.main === module) {
	main().catch((error) => {
		logger.withError(error).error('Fatal error during BlueBot startup');
		process.exit(1);
	});
}
