// Register module aliases for path resolution
// Import environment first to ensure environment variables are loaded
import { execSync } from 'child_process';
import { environment } from './config';
import { logger } from './services/logger';
import SnowbunkClient from './snowbunk/snowbunkClient';
import StarbunkClient from './starbunk/starbunkClient';
import { ensureError } from './utils/errorUtils';

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
		logger.error('Error during cleanup:', ensureError(error));
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
		logger.error('Unhandled promise rejection:', ensureError(error));
	});

	process.on('uncaughtException', async (error: Error) => {
		logger.error('Uncaught exception:', ensureError(error));
		await cleanup();
		process.exit(1);
	});
}

async function initializeClients(): Promise<void> {
	try {
		// Initialize Starbunk
		logger.debug('Initializing Starbunk client with token:', environment.discord.STARBUNK_TOKEN ? 'Token present' : 'Token missing');
		starbunkClient = new StarbunkClient();
		await starbunkClient.init();
		await starbunkClient.login(environment.discord.STARBUNK_TOKEN);
		await starbunkClient.registerCommands();
		await starbunkClient.waitForReady();
		logger.info('Starbunk client initialized and ready');

		// Initialize Snowbunk if token is available
		if (environment.discord.SNOWBUNK_TOKEN) {
			logger.debug('Initializing Snowbunk client with token:', environment.discord.SNOWBUNK_TOKEN ? 'Token present' : 'Token missing');
			snowbunkClient = new SnowbunkClient();
			await snowbunkClient.login(environment.discord.SNOWBUNK_TOKEN);
			logger.info('Snowbunk client initialized');
		}
	} catch (error) {
		logger.error('Error during client initialization:', ensureError(error));
		throw error;
	}
}

async function runBots(): Promise<void> {
	try {
		// Ensure database schema is up-to-date
		logger.info('Checking and applying database schema...');
		try {
			execSync('npx prisma db push', { stdio: 'inherit' });
			logger.info('Database schema is up-to-date.');
		} catch (dbError) {
			logger.error('Failed to apply database schema:', ensureError(dbError));
			// Depending on the desired behavior, you might want to exit here
			// process.exit(1);
			// Or allow the application to continue if the database isn't strictly required for all functions
		}

		// Register process handlers once at startup
		registerProcessHandlers();

		// Start both bots
		await initializeClients();

		logger.info('All bots started successfully');
	} catch (error) {
		logger.error('Failed to start bots:', ensureError(error));
		await cleanup();
		process.exit(1);
	}
}

// Only run if this is the main module
if (require.main === module) {
	runBots().catch(error => {
		console.error('Fatal error:', ensureError(error));
		process.exit(1);
	});
}

export { runBots };
