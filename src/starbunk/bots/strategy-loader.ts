import { logger } from '../../services/logger';
import { ReplyBotAdapter } from './adapter';
import { BotRegistry } from './botRegistry';
import { ReplyBotImpl } from './core/bot-builder';
import ReplyBot from './replyBot';
import { replyBots } from './reply-bots';
import { initializeCovaBot } from '@/starbunk/bots/reply-bots/cova-bot';

class ReplyBotError extends Error {
	constructor(
		message: string,
		public readonly cause?: unknown,
	) {
		super(message);
		this.name = 'ReplyBotError';
	}
}

interface ReplyLoaderConfig {
	covaConfig?: {
		personalityEmbedding?: Float32Array;
		prompts: {
			emulator: string;
			decision: string;
		};
	};
}

// Export the class for testing purposes
export class ReplyBotLoader {
	public static async loadBots(): Promise<ReplyBot[]> {
		logger.info('Loading reply bots...');
		const loadedBots: ReplyBot[] = [];

		try {
			// Initialize CovaBot first
			await this.initializeCovaBot();

			// Load and adapt all other bots
			for (const bot of replyBots) {
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
						error instanceof Error
							? error
							: new ReplyBotError(`Unknown error loading bot ${botName}`, error),
					);
				}
			}

			this.logLoadingSummary(loadedBots);
		} catch (error) {
			logger.error(
				'Critical error loading reply bots:',
				error instanceof Error ? error : new ReplyBotError('Unknown critical error', error),
			);
			return [];
		}

		return loadedBots;
	}

	// Let errors propagate up from the underlying initializeCovaBot
	private static async initializeCovaBot(): Promise<ReplyLoaderConfig> {
		try {
			const covaConfig = await initializeCovaBot();
			return { covaConfig };
		} catch (error) {
			throw new ReplyBotError('Failed to initialize CovaBot', error);
		}
	}

	private static validateBot(bot: unknown): bot is ReplyBotImpl {
		if (!bot || typeof bot !== 'object') {
			logger.warn('Invalid reply bot: not an object');
			return false;
		}

		const requiredProps = {
			name: 'string',
			description: 'string',
			processMessage: 'function',
		} as const;

		const missingProps = Object.entries(requiredProps).filter(([prop, type]) => {
			const value = (bot as Record<string, unknown>)[prop];
			return typeof value !== type;
		});

		if (missingProps.length > 0) {
			logger.warn(
				`Invalid reply bot: missing or invalid properties: ${missingProps.map(([prop]) => prop).join(', ')}`,
			);
			return false;
		}

		return true;
	}

	private static adaptBot(bot: ReplyBotImpl): ReplyBot {
		try {
			logger.debug(`Adapting reply bot: ${bot.name}`);
			return new ReplyBotAdapter(bot);
		} catch (error) {
			throw new ReplyBotError(`Failed to adapt bot ${bot.name}`, error);
		}
	}

	private static logLoadingSummary(loadedBots: ReplyBot[]): void {
		logger.info(`📊 Successfully loaded ${loadedBots.length} reply bots`);
		if (loadedBots.length > 0) {
			logger.info('📋 Reply bots summary:');
			loadedBots.forEach((bot) => {
				logger.info(`   - ${bot.defaultBotName} (${bot.constructor.name})`);
			});
		}
	}
}

// Bind the static method to its class to preserve 'this' context
export const loadReplyBots = ReplyBotLoader.loadBots.bind(ReplyBotLoader);
