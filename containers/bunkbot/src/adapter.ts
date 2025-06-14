import { Message } from 'discord.js';
import { logger } from '@starbunk/shared';
import { BotIdentity } from '../types/botIdentity';
import { ReplyBotImpl } from './core/bot-builder';
import ReplyBot from './replyBot';

/**
 * Adapter class that wraps a ReplyBotImpl to make it compatible with ReplyBot interface.
 * This allows reply bots to work with the existing message processing pipeline.
 */
export class ReplyBotAdapter extends ReplyBot {
	private replyBotImpl: ReplyBotImpl;

	constructor(replyBotImpl: ReplyBotImpl) {
		super();
		this.replyBotImpl = replyBotImpl;

		// Set response rate based on bot configuration
		// We'll extract it from the replyBotImpl's metadata if available
		if (replyBotImpl.metadata && typeof replyBotImpl.metadata.responseRate === 'number') {
			this.responseRate = replyBotImpl.metadata.responseRate;
		}

		logger.debug(
			`[ReplyBotAdapter] Created adapter for ${replyBotImpl.name} with response rate ${this.responseRate}%`,
		);
	}

	get defaultBotName(): string {
		return this.replyBotImpl.name;
	}

	get description(): string {
		return this.replyBotImpl.description;
	}

	get botIdentity(): BotIdentity {
		// We can't easily access the default identity from the reply bot
		// So we'll use a placeholder that will be overridden by the specific trigger's identity
		return {
			botName: this.replyBotImpl.name,
			avatarUrl: '', // Will be provided by the specific trigger
		};
	}

	/**
	 * Implementation of the abstract processMessage method from ReplyBot
	 */
	protected async processMessage(message: Message): Promise<void> {
		try {
			// The reply bot has its own logic for processing messages
			await this.replyBotImpl.processMessage(message);
		} catch (error) {
			logger.error(
				`[${this.defaultBotName}] Error in reply bot message handling:`,
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}
}
