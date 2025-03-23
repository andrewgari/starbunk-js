import path from 'path';
import { logger } from './services/logger';
import { debugModuleLoading } from './util/moduleLoader';

async function main() {
	try {
		// Setup
		logger.info('Starting module debug test');

		// Get absolute path to CovaBot
		const botPath = path.resolve('./src/starbunk/bots/reply-bots/covaBot.ts');
		logger.info(`Testing loading of bot from: ${botPath}`);

		// Test the module loading
		await debugModuleLoading(botPath);

		logger.info('Debug test completed');
	} catch (error) {
		logger.error('Error in debug test:', error instanceof Error ? error : new Error(String(error)));
	}
}

// Run the main function
main().catch(err => {
	console.error('Fatal error:', err);
	process.exit(1);
});
