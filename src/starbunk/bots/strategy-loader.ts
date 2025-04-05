import { logger } from '../../services/logger';
import { StrategyBotAdapter } from './adapter';
import { BotRegistry } from './botRegistry';
import { StrategyBot } from './core/bot-builder';
import ReplyBot from './replyBot';
import { strategyBots } from './strategy-bots';
import { initializeCovaBot } from './strategy-bots/cova-bot';

class StrategyBotError extends Error {
	constructor(message: string, public readonly cause?: unknown) {
		super(message);
		this.name = 'StrategyBotError';
	}
}

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
		try {
			const covaConfig = await initializeCovaBot();
			return { covaConfig };
		} catch (error) {
			throw new StrategyBotError('Failed to initialize CovaBot', error);
		}
	}

	private static validateBot(bot: unknown): bot is StrategyBot {
		if (!bot || typeof bot !== 'object') {
			logger.warn('Invalid strategy bot: not an object');
			return false;
		}

		const requiredProps = {
			name: 'string',
			description: 'string',
			processMessage: 'function'
		} as const;

		const missingProps = Object.entries(requiredProps).filter(([prop, type]) => {
			const value = (bot as Record<string, unknown>)[prop];
			return typeof value !== type;
		});

		if (missingProps.length > 0) {
			logger.warn(
				`Invalid strategy bot: missing or invalid properties: ${missingProps.map(([prop]) => prop).join(', ')
				}`
			);
			return false;
		}

		return true;
	}

	private static adaptBot(bot: StrategyBot): ReplyBot {
		try {
			logger.debug(`Adapting strategy bot: ${bot.name}`);
			return new StrategyBotAdapter(bot);
		} catch (error) {
			throw new StrategyBotError(`Failed to adapt bot ${bot.name}`, error);
		}
	}

	public static async loadBots(): Promise<ReplyBot[]> {
		logger.info('Loading strategy bots...');
		const loadedBots: ReplyBot[] = [];

		try {
			// Initialize CovaBot first
			await this.initializeCovaBot();

			// Load and adapt all other bots
			for (const bot of strategyBots) {
				try {
					if (this.validateBot(bot)) {
						const adaptedBot = this.adaptBot(bot);
						const registryInstance = BotRegistry.getInstance();
						registryInstance.registerBot(adaptedBot);
						loadedBots.push(adaptedBot);
						logger.debug(`Successfully loaded bot: ${bot.name}`);
					}
				} catch (error) {
					const botName = this.validateBot(bot) ? bot.name : 'unknown';
					logger.error(
						`Failed to load bot: ${botName}`,
						error instanceof Error ? error : new StrategyBotError(`Unknown error loading bot ${botName}`, error)
					);
				}
			}

			this.logLoadingSummary(loadedBots);
		} catch (error) {
			logger.error(
				'Critical error loading strategy bots:',
				error instanceof Error ? error : new StrategyBotError('Unknown critical error', error)
			);
			return [];
		}

		return loadedBots;
	}

	private static logLoadingSummary(loadedBots: ReplyBot[]): void {
		logger.info(`📊 Successfully loaded ${loadedBots.length} strategy bots`);
		if (loadedBots.length > 0) {
			logger.info('📋 Strategy bots summary:');
			loadedBots.forEach(bot => {
				logger.info(`   - ${bot.defaultBotName} (${bot.constructor.name})`);
			});
		}
	}
}

// Bind the static method to its class to preserve 'this' context
export const loadStrategyBots = StrategyBotLoader.loadBots.bind(StrategyBotLoader);
