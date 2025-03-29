import fs from 'fs';
import path from 'path';
import { logger } from '../../services/logger';
import { StrategyBotAdapter } from './adapter';
import { BotRegistry } from './botRegistry';
import { StrategyBot } from './core/bot-builder';
import ReplyBot from './replyBot';

/**
 * Loads all strategy bots from the strategy-bots directory
 */
export async function loadStrategyBots(): Promise<ReplyBot[]> {
	logger.info('Loading strategy bots...');
	const loadedBots: ReplyBot[] = [];

	try {
		// Initialize CovaBot first
		try {
			const { initializeCovaBot } = require('./strategy-bots/cova-bot');
			await initializeCovaBot();
			logger.info('CovaBot initialization complete');
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			logger.error('Failed to initialize CovaBot:', err);
			logger.warn('CovaBot will use default behavior without personality embedding');
			// Continue loading other bots even if CovaBot fails
		}

		const isDev = process.env.NODE_ENV === 'development';
		const isTsNode = process.argv[0].includes('ts-node') ||
			(process.env.npm_lifecycle_script && process.env.npm_lifecycle_script.includes('ts-node'));

		// Determine extension based on environment
		const fileExtension = (isDev || isTsNode) ? '.ts' : '.js';
		const baseDir = (isDev || isTsNode) ? './src' : './dist';
		const strategyBotsDir = path.resolve(`${baseDir}/starbunk/bots/strategy-bots`);

		logger.debug(`Looking for strategy bots in: ${strategyBotsDir}`);

		// Get all directories in the strategy-bots folder
		if (!fs.existsSync(strategyBotsDir)) {
			logger.warn(`Strategy bots directory does not exist: ${strategyBotsDir}`);
			return loadedBots;
		}

		const botDirs = fs.readdirSync(strategyBotsDir, { withFileTypes: true })
			.filter(dirent => dirent.isDirectory())
			.map(dirent => dirent.name);

		logger.debug(`Found ${botDirs.length} potential strategy bot directories: ${botDirs.join(', ')}`);

		for (const botDir of botDirs) {
			try {
				const botIndexPath = path.join(strategyBotsDir, botDir, `index${fileExtension}`);

				// Skip if index file doesn't exist
				if (!fs.existsSync(botIndexPath)) {
					logger.debug(`No index file found for bot in directory: ${botDir}`);
					continue;
				}

				logger.debug(`Loading strategy bot from: ${botIndexPath}`);

				// Try to load the bot with direct require
				try {
					// Add .js extension for Node.js ES modules
					const modulePath = botIndexPath.replace(/\.ts$/, '.js');
					// eslint-disable-next-line @typescript-eslint/no-var-requires
					const botObj = require(modulePath.replace(/\.js$/, '')).default;

					if (botObj) {
						// Check if it's a StrategyBot and adapt it
						if (isStrategyBot(botObj)) {
							logger.debug(`Strategy bot detected: ${botObj.name}`);
							const adaptedBot = new StrategyBotAdapter(botObj);
							loadedBots.push(adaptedBot);
							BotRegistry.getInstance().registerBot(adaptedBot);
							continue;
						}

						// Not a valid strategy bot
						logger.warn(`⚠️ Not a valid strategy bot: ${botIndexPath}`);
					} else {
						logger.warn(`⚠️ No default export found in: ${botIndexPath}`);
					}
				} catch (error) {
					logger.error(`❌ Failed to load strategy bot: ${botIndexPath}`, error instanceof Error ? error : new Error(String(error)));
				}
			} catch (error) {
				logger.error(`Error processing bot directory ${botDir}:`, error instanceof Error ? error : new Error(String(error)));
			}
		}

		// Log summary only once at the end
		logger.info(`📊 Successfully loaded ${loadedBots.length} strategy bots`);
		if (loadedBots.length > 0) {
			logger.info('📋 Strategy bots summary:');
			loadedBots.forEach(bot => {
				logger.info(`   - ${bot.defaultBotName} (${bot.constructor.name})`);
			});
		}
	} catch (error) {
		logger.error('Error loading strategy bots:', error instanceof Error ? error : new Error(String(error)));
	}

	return loadedBots;
}

// Helper function to check if an object is a StrategyBot
function isStrategyBot(obj: unknown): obj is StrategyBot {
	const bot = obj as Partial<StrategyBot>;
	return !!(
		bot &&
		typeof bot.name === 'string' &&
		typeof bot.description === 'string' &&
		typeof bot.processMessage === 'function'
	);
}
