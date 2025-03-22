// Register module aliases for path resolution
// Import config first to ensure environment variables are loaded
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables immediately before any other imports
// Use absolute path to ensure the .env file is found regardless of working directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { GatewayIntentBits } from 'discord.js';
import { logger } from './services/logger';
import SnowbunkClient from './snowbunk/snowbunkClient';
import StarbunkClient from './starbunk/starbunkClient';

export async function runStarbunkBot(): Promise<void> {
	logger.info('Starting Starbunk bot');
	try {
		const token = process.env.TOKEN;
		const clientId = process.env.CLIENT_ID;

		if (!token) {
			logger.error('TOKEN environment variable is not set');
			throw new Error('TOKEN environment variable is not set');
		}

		if (!clientId) {
			logger.error('CLIENT_ID environment variable is not set');
			throw new Error('CLIENT_ID environment variable is not set');
		}

		logger.debug('Creating StarbunkClient');
		const client = new StarbunkClient();

		// Initialize the client
		await client.init();

		// Bootstrap application services
		logger.info('Bootstrapping application services');
		try {
			// Import here to avoid circular dependencies
			const { bootstrapApplication } = require('./services/bootstrap');
			await bootstrapApplication(client);
			logger.info('Application services bootstrapped successfully');
		} catch (error) {
			logger.error('Failed to bootstrap application services:', error instanceof Error ? error : new Error(String(error)));
			throw error;
		}

		logger.info('Logging in to Discord');
		try {
			await client.login(token);
			logger.info('Successfully logged in to Discord');
		} catch (error) {
			logger.error('Failed to log in to Discord:', error instanceof Error ? error : new Error(String(error)));
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
				logger.error('Error during shutdown:', error instanceof Error ? error : new Error(String(error)));
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
				logger.error('Error during shutdown:', error instanceof Error ? error : new Error(String(error)));
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
		logger.error('Fatal error during bot startup:', error instanceof Error ? error : new Error(String(error)));
		process.exit(1);
	}
}

const runSnowbunkBot = async (): Promise<void> => {
	// Import logger to ensure it's available
	const { logger } = require('./services/logger');
	logger.info('Starting Snowbunk bot');

	const snowbunk = new SnowbunkClient({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.GuildVoiceStates
		]
	});

	// Bootstrap application services
	logger.info('Bootstrapping application services for Snowbunk');
	try {
		// Import here to avoid circular dependencies
		const { bootstrapApplication } = require('./services/bootstrap');
		await bootstrapApplication(snowbunk);
		logger.info('Snowbunk application services bootstrapped successfully');
	} catch (error) {
		logger.error('Failed to bootstrap Snowbunk application services:', error instanceof Error ? error : new Error(String(error)));
		throw error;
	}

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
