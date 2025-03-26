import fs from 'fs';
import path from 'path';
import ReplyBot from './replyBot';
import { BotRegistry } from './botRegistry';
import { logger } from '../../services/logger';

/**
 * Loads all strategy bots from the strategy-bots directory
 * This is a simplified loader that can be integrated with StarbunkClient
 */
export async function loadStrategyBots(): Promise<ReplyBot[]> {
	logger.info('Loading strategy bots...');
	const loadedBots: ReplyBot[] = [];
  
	try {
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
      
		logger.info(`Found ${botDirs.length} potential strategy bot directories: ${botDirs.join(', ')}`);
    
		for (const botDir of botDirs) {
			try {
				const botIndexPath = path.join(strategyBotsDir, botDir, `index${fileExtension}`);
        
				// Skip if index file doesn't exist
				if (!fs.existsSync(botIndexPath)) {
					logger.debug(`No index file found for bot in directory: ${botDir}`);
					continue;
				}
        
				logger.info(`Loading strategy bot from: ${botIndexPath}`);
        
				// Try to load the bot with direct require
				try {
					// eslint-disable-next-line @typescript-eslint/no-var-requires
					const botInstance = require(botIndexPath.replace(/\.ts$/, '')).default;
          
					if (botInstance && typeof botInstance.handleMessage === 'function') {
						logger.info(`✅ Strategy bot loaded successfully: ${botInstance.defaultBotName}`);
						loadedBots.push(botInstance);
						BotRegistry.getInstance().registerBot(botInstance);
					} else {
						logger.warn(`⚠️ Invalid bot instance from: ${botIndexPath}`);
					}
				} catch (error) {
					logger.error(`❌ Failed to load strategy bot: ${botIndexPath}`, error instanceof Error ? error : new Error(String(error)));
				}
			} catch (error) {
				logger.error(`Error processing bot directory ${botDir}:`, error instanceof Error ? error : new Error(String(error)));
			}
		}
    
		logger.info(`📊 Successfully loaded ${loadedBots.length} strategy bots`);
    
		if (loadedBots.length > 0) {
			logger.info('📋 Loaded strategy bots summary:');
			loadedBots.forEach(bot => {
				logger.info(`   - ${bot.defaultBotName} (${bot.constructor.name})`);
			});
		}
	} catch (error) {
		logger.error('Error loading strategy bots:', error instanceof Error ? error : new Error(String(error)));
	}
  
	return loadedBots;
}