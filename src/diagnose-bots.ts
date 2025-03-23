import fs from 'fs';
import path from 'path';
import { logger } from './services/logger';
import { loadBot } from './util/moduleLoader';

const BOT_DIR = path.resolve('./src/starbunk/bots/reply-bots');

async function main() {
	try {
		// Setup
		logger.info('Starting bot diagnostic test');
		logger.info(`Using bot directory: ${BOT_DIR}`);

		// Find all bot files
		const botFiles = fs.readdirSync(BOT_DIR)
			.filter(file => file.endsWith('.ts') && !file.endsWith('.d.ts'))
			.map(file => path.join(BOT_DIR, file));

		logger.info(`Found ${botFiles.length} bot files to load: ${botFiles.map(f => path.basename(f)).join(', ')}`);

		// Try to load each bot
		let successCount = 0;
		for (const botFile of botFiles) {
			try {
				logger.info(`Loading bot from file: ${botFile}`);
				const bot = await loadBot(botFile);

				if (bot) {
					logger.info(`✅ Bot loaded successfully: ${bot.defaultBotName} (${bot.constructor.name})`);
					successCount++;
				} else {
					logger.error(`❌ No bot instance returned from: ${botFile}`);
				}
			} catch (error) {
				logger.error(`❌ Failed to load bot: ${botFile}`, error instanceof Error ? error : new Error(String(error)));
			}
		}

		logger.info(`----------------------------------------`);
		logger.info(`📊 Summary: Successfully loaded ${successCount} out of ${botFiles.length} bots`);
		logger.info(`----------------------------------------`);
	} catch (error) {
		logger.error('Error in diagnostic test:', error instanceof Error ? error : new Error(String(error)));
	}
}

// Run the main function
main().catch(err => {
	console.error('Fatal error:', err);
	process.exit(1);
});
