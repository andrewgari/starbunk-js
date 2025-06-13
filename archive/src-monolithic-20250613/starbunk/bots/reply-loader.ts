import { logger } from '../../services/logger';
import { BotRegistry } from './botRegistry';
import { ReplyBotAdapter } from './adapter';
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

/**
 * @deprecated Use BotRegistry.discoverBots() instead.
 * This class is kept for backward compatibility.
 */
export class ReplyBotLoader {
	/**
	 * Load reply bots using the new automatic discovery mechanism
	 * @returns Array of loaded reply bots
	 * @deprecated Use BotRegistry.discoverBots() instead
	 */
	public static async loadBots(): Promise<ReplyBot[]> {
		// Check if we're running in a test environment
		const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

		if (isTestEnvironment) {
			logger.info('Loading reply bots (test environment, using legacy approach)...');
			const loadedBots: ReplyBot[] = [];

			try {
				// Initialize CovaBot first
				await this.initializeCovaBot();

				// Load and adapt all other bots (legacy approach for tests)
				for (const bot of replyBots as ReplyBotImpl[]) {
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
		} else {
			logger.info('Loading reply bots (using automatic discovery)...');

			try {
				// Initialize CovaBot first
				await this.initializeCovaBot();

				// Use the new automatic discovery mechanism
				return await BotRegistry.discoverBots();
			} catch (error) {
				logger.error(
					'Critical error loading reply bots:',
					error instanceof Error ? error : new ReplyBotError('Unknown critical error', error),
				);
				return [];
			}
		}
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

	// The following methods are kept for backward compatibility with tests

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

/**
 * @deprecated Use BotRegistry.discoverBots() instead.
 * This function is kept for backward compatibility.
 */
export const loadReplyBots = ReplyBotLoader.loadBots.bind(ReplyBotLoader);
