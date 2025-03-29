import fs from 'fs';
import path from 'path';
import { logger } from '../../services/logger';
import { BotRegistry } from './botRegistry';
import { VoiceBotAdapter } from './core/voice-bot-adapter';
import { VoiceBot } from './core/voice-bot-builder';

/**
 * Type guard to check if an object is a VoiceBot
 */
function isVoiceBot(obj: unknown): obj is VoiceBot {
	if (!obj || typeof obj !== 'object') {
		return false;
	}

	const bot = obj as VoiceBot;
	return (
		typeof bot.name === 'string' &&
		typeof bot.description === 'string' &&
		typeof bot.onVoiceStateUpdate === 'function' &&
		typeof bot.getVolume === 'function' &&
		typeof bot.setVolume === 'function'
	);
}

/**
 * Loads all voice bots from the voice-bots directory
 */
export async function loadVoiceBots(): Promise<VoiceBotAdapter[]> {
	logger.info('Loading voice bots...');
	const loadedBots: VoiceBotAdapter[] = [];

	try {
		const isDev = process.env.NODE_ENV === 'development';
		const isTsNode = process.argv[0].includes('ts-node') ||
			(process.env.npm_lifecycle_script && process.env.npm_lifecycle_script.includes('ts-node'));

		// Determine extension based on environment
		const fileExtension = (isDev || isTsNode) ? '.ts' : '.js';
		const baseDir = (isDev || isTsNode) ? './src' : './dist';
		const voiceBotsDir = path.resolve(`${baseDir}/starbunk/bots/voice-bots`);

		logger.debug(`Environment: NODE_ENV=${process.env.NODE_ENV}, ts-node=${isTsNode}, fileExtension=${fileExtension}`);
		logger.debug(`Base directory: ${baseDir}`);
		logger.debug(`Looking for voice bots in: ${voiceBotsDir}`);

		// Get all directories in the voice-bots folder
		if (!fs.existsSync(voiceBotsDir)) {
			logger.warn(`Voice bots directory does not exist: ${voiceBotsDir}`);
			return loadedBots;
		}

		const botDirs = fs.readdirSync(voiceBotsDir, { withFileTypes: true })
			.filter(dirent => dirent.isDirectory())
			.map(dirent => dirent.name);

		logger.info(`Found ${botDirs.length} potential voice bot directories: ${botDirs.join(', ')}`);

		for (const botDir of botDirs) {
			try {
				const botIndexPath = path.join(voiceBotsDir, botDir, `index${fileExtension}`);
				logger.debug(`Checking for bot index at: ${botIndexPath}`);

				// Skip if index file doesn't exist
				if (!fs.existsSync(botIndexPath)) {
					logger.debug(`No index file found for bot in directory: ${botDir}`);
					continue;
				}

				logger.info(`Loading voice bot from: ${botIndexPath}`);

				// Try to load the bot with direct require
				try {
					// Add .js extension for Node.js ES modules
					const modulePath = botIndexPath.replace(/\.ts$/, '.js');
					logger.debug(`Attempting to require module from: ${modulePath}`);

					// eslint-disable-next-line @typescript-eslint/no-var-requires
					const botObj = require(modulePath.replace(/\.js$/, '')).default;

					if (botObj) {
						// Check if it's a VoiceBot and adapt it
						if (isVoiceBot(botObj)) {
							logger.info(`✅ Voice bot detected: ${botObj.name}`);
							const adaptedBot = new VoiceBotAdapter(botObj);
							loadedBots.push(adaptedBot);
							BotRegistry.getInstance().registerBot(adaptedBot);
							continue;
						}

						logger.warn(`⚠️ Object found but not a valid voice bot: ${botIndexPath}`);
						logger.debug('Bot object properties:', Object.keys(botObj).join(', '));
					} else {
						logger.warn(`⚠️ No default export found in: ${botIndexPath}`);
					}
				} catch (error) {
					logger.error(`❌ Failed to load voice bot: ${botIndexPath}`, error instanceof Error ? error : new Error(String(error)));
					logger.debug('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
				}
			} catch (error) {
				logger.error(`Error processing bot directory ${botDir}:`, error instanceof Error ? error : new Error(String(error)));
				logger.debug('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
			}
		}

		logger.info(`📊 Successfully loaded ${loadedBots.length} voice bots`);

		if (loadedBots.length > 0) {
			logger.info('📋 Loaded voice bots summary:');
			loadedBots.forEach(bot => {
				logger.info(`   - ${bot.name}`);
			});
		}
	} catch (error) {
		logger.error('Error loading voice bots:', error instanceof Error ? error : new Error(String(error)));
		logger.debug('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
	}

	return loadedBots;
}
