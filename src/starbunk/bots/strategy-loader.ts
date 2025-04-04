import { logger } from '../../services/logger';
import { StrategyBotAdapter } from './adapter';
import { BotRegistry } from './botRegistry';
import { StrategyBot } from './core/bot-builder';
import ReplyBot from './replyBot';
import { strategyBots } from './strategy-bots';
import { initializeCovaBot } from './strategy-bots/cova-bot';

interface StrategyLoaderConfig {
	covaConfig?: {
		personalityEmbedding?: Float32Array;
		prompts: {
			emulator: string;
			decision: string;
		};
	};
}

// Export the class for testing purposes
export class StrategyBotLoader {
	// Let errors propagate up from the underlying initializeCovaBot
	private static async initializeCovaBot(): Promise<StrategyLoaderConfig> {
		const covaConfig = await initializeCovaBot();
		return { covaConfig };
	}

	private static validateBot(bot: unknown): bot is StrategyBot {
		const strategyBot = bot as Partial<StrategyBot>;
		const isValid = !!(
			strategyBot &&
			typeof strategyBot.name === 'string' &&
			typeof strategyBot.description === 'string' &&
			typeof strategyBot.processMessage === 'function'
		);

		if (!isValid) {
			logger.warn(`Invalid strategy bot detected: ${JSON.stringify(strategyBot)}`);
		}

		return isValid;
	}

	private static adaptBot(bot: StrategyBot): ReplyBot {
		logger.debug(`Adapting strategy bot: ${bot.name}`);
		return new StrategyBotAdapter(bot);
	}

	public static async loadBots(): Promise<ReplyBot[]> {
		logger.info('Loading strategy bots...');
		const loadedBots: ReplyBot[] = [];

		try {
			// Initialize CovaBot first. If this fails, the outer catch will handle it.
			// await this.initializeCovaBot(); // REMOVED - Redundant call, initialization should happen via instance creation or module import

			// Load and adapt all other bots
			for (const bot of strategyBots) {
				try {
					if (StrategyBotLoader.validateBot(bot)) {
						const adaptedBot = StrategyBotLoader.adaptBot(bot);
						const registryInstance = BotRegistry.getInstance();
						registryInstance.registerBot(adaptedBot);
						// Only push the bot if adaptation and registration succeed
						loadedBots.push(adaptedBot);
						logger.debug(`Successfully loaded bot: ${bot.name}`);
					}
				} catch (error) {
					// Log the error for the specific bot but continue loading others
					logger.error(
						`Failed to load bot: ${(bot as Partial<StrategyBot>)?.name || 'unknown'}`,
						error instanceof Error ? error : new Error(String(error))
					);
				}
			}

			// Log summary
			logger.info(`📊 Successfully loaded ${loadedBots.length} strategy bots`);
			if (loadedBots.length > 0) {
				logger.info('📋 Strategy bots summary:');
				loadedBots.forEach(bot => {
					logger.info(`   - ${bot.defaultBotName} (${bot.constructor.name})`);
				});
			}
		} catch (error) {
			// Catch errors from initializeCovaBot or other unexpected critical errors
			logger.error('Critical error loading strategy bots:', error instanceof Error ? error : new Error(String(error)));
			// Return empty array as loading failed critically
			return [];
		}

		return loadedBots;
	}
}

export const loadStrategyBots = StrategyBotLoader.loadBots;
