import { Message } from 'discord.js';
import { logger } from '../../services/logger';
import { BotIdentity } from '../types/botIdentity';
import { StrategyBot } from './core/bot-builder';
import ReplyBot from './replyBot';

/**
 * Adapter class that wraps a StrategyBot to make it compatible with ReplyBot interface.
 * This allows strategy bots to work with the existing message processing pipeline.
 */
export class StrategyBotAdapter extends ReplyBot {
	private strategyBot: StrategyBot;

	constructor(strategyBot: StrategyBot) {
		super();
		this.strategyBot = strategyBot;
		logger.debug(`[StrategyBotAdapter] Created adapter for ${strategyBot.name}`);
	}

	get defaultBotName(): string {
		return this.strategyBot.name;
	}

	get description(): string {
		return this.strategyBot.description;
	}

	get botIdentity(): BotIdentity {
		// We can't easily access the default identity from the strategy bot
		// So we'll use a placeholder that will be overridden by the specific trigger's identity
		return {
			botName: this.strategyBot.name,
			avatarUrl: '' // Will be provided by the specific trigger
		};
	}

	/**
	 * Implementation of the abstract processMessage method from ReplyBot
	 */
	protected async processMessage(message: Message): Promise<void> {
		try {
			// The strategy bot has its own logic for processing messages
			await this.strategyBot.processMessage(message);
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error in strategy bot message handling:`, error instanceof Error ? error : new Error(String(error)));
		}
	}
}