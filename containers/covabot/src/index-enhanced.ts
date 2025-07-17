// Enhanced CovaBot - Main entry point with comprehensive AI features
import { logger } from '@starbunk/shared';
import { EnhancedCovaBot } from './cova-bot/EnhancedCovaBot';
import { createCovaBotConfig, validateConfig } from './config';
import { WebServer } from './web/WebServer';

let bot: EnhancedCovaBot | null = null;
let webServer: WebServer | null = null;

async function main() {
	try {
		logger.info('🚀 Starting Enhanced CovaBot...');

		// Load and validate configuration
		const config = createCovaBotConfig();
		validateConfig(config);
		logger.info('✅ Configuration loaded and validated');

		// Initialize Enhanced CovaBot
		bot = new EnhancedCovaBot(config);
		await bot.start();

		// Start web interface
		webServer = new WebServer(config, bot);
		await webServer.start();

		logger.info('✅ Enhanced CovaBot is fully operational');
		logger.info(`🌐 Web interface available at http://${config.web.host}:${config.web.port}`);

		// Setup graceful shutdown
		setupGracefulShutdown();

	} catch (error) {
		logger.error('❌ Failed to start Enhanced CovaBot:', error);
		await cleanup();
		process.exit(1);
	}
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown(): void {
	const shutdown = async (signal: string) => {
		logger.info(`📡 Received ${signal}, shutting down gracefully...`);
		await cleanup();
		process.exit(0);
	};

	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));
	process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon

	// Handle uncaught exceptions
	process.on('uncaughtException', async (error) => {
		logger.error('💥 Uncaught exception:', error);
		await cleanup();
		process.exit(1);
	});

	process.on('unhandledRejection', async (reason, promise) => {
		logger.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
		await cleanup();
		process.exit(1);
	});
}

/**
 * Cleanup resources
 */
async function cleanup(): Promise<void> {
	try {
		logger.info('🧹 Cleaning up resources...');

		// Stop web server
		if (webServer) {
			await webServer.stop();
			webServer = null;
		}

		// Stop bot
		if (bot) {
			await bot.stop();
			bot = null;
		}

		logger.info('✅ Cleanup completed');
	} catch (error) {
		logger.error('❌ Error during cleanup:', error);
	}
}

// Start the application
main();
