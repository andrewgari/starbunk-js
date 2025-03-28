// Register module aliases for path resolution
// Import environment first to ensure environment variables are loaded
import { environment } from './config';
import { logger } from './services/logger';
import SnowbunkClient from './snowbunk/snowbunkClient';
import StarbunkClient from './starbunk/starbunkClient';

// Global references to clients for cleanup
let starbunkClient: StarbunkClient | null = null;
let snowbunkClient: SnowbunkClient | null = null;

// Cleanup function
async function cleanup(): Promise<void> {
	logger.info('Cleaning up bot connections...');
	try {
		if (starbunkClient) {
			await starbunkClient.destroy();
			logger.info('Starbunk bot shutdown complete');
			starbunkClient = null;
		}
		if (snowbunkClient) {
			await snowbunkClient.destroy();
			logger.info('Snowbunk bot shutdown complete');
			snowbunkClient = null;
		}
	} catch (error) {
		logger.error('Error during cleanup:', error instanceof Error ? error : new Error(String(error)));
	}
}

// Register process handlers once
function registerProcessHandlers(): void {
	process.on('SIGINT', async () => {
		logger.info('Received SIGINT signal');
		await cleanup();
		process.exit(0);
	});

	process.on('SIGTERM', async () => {
		logger.info('Received SIGTERM signal');
		await cleanup();
		process.exit(0);
	});

	process.on('unhandledRejection', (error: Error) => {
		logger.error('Unhandled promise rejection:', error);
	});

	process.on('uncaughtException', async (error: Error) => {
		logger.error('Uncaught exception:', error);
		await cleanup();
		process.exit(1);
	});
}

async function initializeClients(): Promise<void> {
	try {
		// Initialize Starbunk
		starbunkClient = new StarbunkClient();
		await starbunkClient.init();
		await starbunkClient.login(environment.discord.STARBUNK_TOKEN);
		await starbunkClient.registerCommands();
		await starbunkClient.waitForReady();
		logger.info('Starbunk client initialized and ready');

		// Initialize Snowbunk if token is available
		if (environment.discord.SNOWBUNK_TOKEN) {
			snowbunkClient = new SnowbunkClient();
			await snowbunkClient.login(environment.discord.SNOWBUNK_TOKEN);
			logger.info('Snowbunk client initialized');
		}
	} catch (error) {
		logger.error('Error during client initialization:', error instanceof Error ? error : new Error(String(error)));
		throw error;
	}
}

async function runBots(): Promise<void> {
	try {
		// Register process handlers once at startup
		registerProcessHandlers();

		// Start both bots
		await initializeClients();

		logger.info('All bots started successfully');
	} catch (error) {
		logger.error('Failed to start bots:', error instanceof Error ? error : new Error(String(error)));
		await cleanup();
		process.exit(1);
	}
}

// Only run if this is the main module
if (require.main === module) {
	runBots().catch(error => {
		console.error('Fatal error:', error);
		process.exit(1);
	});
}

export { runBots };

