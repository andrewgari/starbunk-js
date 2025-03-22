// Register module aliases for path resolution
// Import config first to ensure environment variables are loaded
import { GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { logger } from './services/logger';
import SnowbunkClient from './snowbunk/snowbunkClient';
import StarbunkClient from './starbunk/starbunkClient';

// This is a fallback in case config.ts doesn't load the environment variables
if (!process.env.DISCORD_TOKEN) {
	dotenv.config();
}

export async function runStarbunkBot(): Promise<void> {
	logger.info('Starting Starbunk bot');
	try {
		const token = process.env.DISCORD_TOKEN;
		const clientId = process.env.CLIENT_ID;

		if (!token) {
			logger.error('DISCORD_TOKEN environment variable is not set');
			throw new Error('DISCORD_TOKEN environment variable is not set');
		}

		if (!clientId) {
			logger.error('CLIENT_ID environment variable is not set');
			throw new Error('CLIENT_ID environment variable is not set');
		}

		logger.debug('Creating StarbunkClient with required intents');
		const client = new StarbunkClient({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildVoiceStates
			]
		});

		logger.info('Registering commands');
		try {
			await client.registerCommands();
			logger.info('Commands registered successfully');
		} catch (error) {
			logger.error('Failed to register commands:', error as Error);
			// Continue startup even if command registration fails
		}

		logger.info('Logging in to Discord');
		try {
			await client.login(token);
			logger.info('Successfully logged in to Discord');
		} catch (error) {
			logger.error('Failed to log in to Discord:', error as Error);
			throw error;
		}

		// Handle process termination
		process.on('SIGINT', async () => {
			logger.info('Received SIGINT signal');
			try {
				await client.destroy();
				logger.info('Bot shutdown complete');
				process.exit(0);
			} catch (error) {
				logger.error('Error during shutdown:', error as Error);
				process.exit(1);
			}
		});

		process.on('SIGTERM', async () => {
			logger.info('Received SIGTERM signal');
			try {
				await client.destroy();
				logger.info('Bot shutdown complete');
				process.exit(0);
			} catch (error) {
				logger.error('Error during shutdown:', error as Error);
				process.exit(1);
			}
		});

		process.on('unhandledRejection', (error: Error) => {
			logger.error('Unhandled promise rejection:', error);
		});

		process.on('uncaughtException', (error: Error) => {
			logger.error('Uncaught exception:', error);
			// Attempt graceful shutdown
			client.destroy().finally(() => process.exit(1));
		});

		logger.info('Bot startup complete');
	} catch (error) {
		logger.error('Fatal error during bot startup:', error as Error);
		process.exit(1);
	}
}

const runSnowbunkBot = async (): Promise<void> => {
	const snowbunk = new SnowbunkClient({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.GuildVoiceStates
		]
	});

	await snowbunk.login(process.env.SNOWBUNK_TOKEN);
};

const runBots = async (): Promise<void> => {
	try {
		await Promise.all([
			runStarbunkBot().catch(error => {
				console.error('Starbunk Error:', error);
				throw error;
			}),
			runSnowbunkBot().catch(error => {
				console.error('Snowbunk Error:', error);
				throw error;
			})
		]);
	} catch (error) {
		console.error('Failed to start bots:', error);
		process.exit(1);
	}
};

runBots().then();
