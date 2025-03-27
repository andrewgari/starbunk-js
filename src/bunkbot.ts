// Register module aliases for path resolution
// Import environment first to ensure environment variables are loaded
import environment, { isDebugMode } from './environment';
import { logger } from './services/logger';
import SnowbunkClient from './snowbunk/snowbunkClient';
import StarbunkClient from './starbunk/starbunkClient';

export async function runStarbunkBot(): Promise<void> {
	logger.info('Starting Starbunk bot');
	try {
		const token = environment.discord.STARBUNK_TOKEN;

		logger.debug('Creating StarbunkClient');
		const client = new StarbunkClient();

		// Initialize the client
		await client.init();

		// If we're in testing mode, don't try to connect to Discord
		if (isDebugMode()) {
			logger.info('Running in testing mode - skipping Discord login');
			return;
		}

		// Log in to Discord
		logger.info('Logging in to Discord');
		try {
			await client.login(token);
		} catch (error) {
			logger.error('Failed to log in to Discord:', error instanceof Error ? error : new Error(String(error)));
			client.destroy();
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
		throw error;
	}
}

const runSnowbunkBot = async (): Promise<void> => {
	// Import logger to ensure it's available
	const { logger } = require('./services/logger');
	logger.info('Starting Snowbunk bot');

	const snowbunk = new SnowbunkClient();

	// If we're in testing mode, don't try to connect to Discord
	if (isDebugMode()) {
		logger.info('Running in testing mode - skipping Snowbunk Discord login');
		return;
	}

	// Login to Discord
	try {
		await snowbunk.login(environment.discord.SNOWBUNK_TOKEN);
	} catch (error) {
		logger.error('Failed to log in to Discord with Snowbunk:', error instanceof Error ? error : new Error(String(error)));
		throw error;
	}
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
