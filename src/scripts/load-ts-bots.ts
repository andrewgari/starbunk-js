import fs from 'fs';
import path from 'path';
import { setDebugMode } from '../environment';
import { logger } from '../services/logger';
import ReplyBot from '../starbunk/bots/replyBot';
import { loadBot } from '../util/moduleLoader';

// Setup environment
process.env.NODE_ENV = 'development';
setDebugMode(true);
process.env.TS_NODE_DEV = 'true';

// Helper function to validate a bot instance
function validateBot(bot: ReplyBot | null, filePath: string): boolean {
	if (!bot) {
		logger.error(`❌ No bot instance returned from ${filePath}`);
		return false;
	}

	logger.info(`✅ Bot loaded successfully: ${bot.defaultBotName}`);

	// Validate the bot has required properties
	if (typeof bot.handleMessage !== 'function') {
		logger.error(`❌ Bot is missing handleMessage method: ${filePath}`);
		return false;
	}

	if (typeof bot.auditMessage !== 'function') {
		logger.error(`❌ Bot is missing auditMessage method: ${filePath}`);
		return false;
	}

	if (typeof bot.defaultBotName !== 'string' && typeof bot.defaultBotName !== 'function') {
		logger.error(`❌ Bot is missing defaultBotName property: ${filePath}`);
		return false;
	}

	logger.info(`✅ Bot implements all required methods`);
	return true;
}

async function loadAndValidateBots(): Promise<void> {
	logger.info('Starting bot loading diagnostic test');

	// Find all bot files
	const botDir = path.resolve('./src/starbunk/bots/reply-bots');
	logger.info(`Looking for bots in ${botDir}`);

	if (!fs.existsSync(botDir)) {
		logger.error(`❌ Bot directory not found: ${botDir}`);
		return;
	}

	const botFiles = fs.readdirSync(botDir)
		.filter(file => file.endsWith('.ts') && !file.endsWith('.d.ts'))
		.map(file => path.join(botDir, file));

	logger.info(`Found ${botFiles.length} TypeScript bot files`);

	// Try to load each bot
	let successCount = 0;

	for (const botFile of botFiles) {
		try {
			logger.info(`Loading bot from ${path.basename(botFile)}...`);

			// First try direct require
			try {
				logger.info(`Attempting direct require for ${path.basename(botFile)}`);
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				const BotClass = require(botFile.replace(/\.ts$/, '')).default;
				if (BotClass) {
					const bot = new BotClass();
					if (validateBot(bot, botFile)) {
						successCount++;
					}
					continue; // Skip to next bot file
				} else {
					logger.warn(`⚠️ No default export found in ${path.basename(botFile)}`);
				}
			} catch (requireError: unknown) {
				const errorMessage = requireError instanceof Error
					? requireError.message
					: 'Unknown error';
				logger.warn(`⚠️ Direct require failed for ${path.basename(botFile)}: ${errorMessage}`);
				// Continue to try the loadBot utility
			}

			// Try loadBot utility
			logger.info(`Attempting loadBot utility for ${path.basename(botFile)}`);
			const bot = await loadBot(botFile);

			if (validateBot(bot, botFile)) {
				successCount++;
			}
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error : new Error('Unknown error');
			logger.error(`❌ Failed to load bot ${path.basename(botFile)}:`, errorMessage);
		}
	}

	logger.info(`📊 Loading results: ${successCount} out of ${botFiles.length} bots loaded successfully`);
}

// Add a test for the CovaBot specifically
async function testCovaBot(): Promise<void> {
	logger.info('Specifically testing CovaBot load...');
	const covaBotPath = path.resolve('./src/starbunk/bots/reply-bots/covaBot.ts');

	try {
		if (!fs.existsSync(covaBotPath)) {
			logger.error(`❌ CovaBot file not found at ${covaBotPath}`);
			return;
		}

		logger.info('Loading CovaBot directly...');
		const bot = await loadBot(covaBotPath);

		if (validateBot(bot, covaBotPath)) {
			logger.info('👍 CovaBot loaded successfully!');
		} else {
			logger.error('👎 CovaBot validation failed');
		}
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error : new Error('Unknown error');
		logger.error('Error loading CovaBot:', errorMessage);
	}
}

// Run the tests
async function runTests(): Promise<void> {
	try {
		await loadAndValidateBots();
		await testCovaBot();
		logger.info('All tests complete');
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error : new Error('Unknown error');
		logger.error('Error running tests:', errorMessage);
	}
}

// Execute the tests
runTests().catch(err => {
	logger.error('Fatal error:', err);
	process.exit(1);
});
