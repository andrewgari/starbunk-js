import { logger, ensureError, MessageFilter } from '@starbunk/shared';
import { Message } from 'discord.js';
import { ReplyBotImpl } from './bot-builder';
import { shouldExcludeFromReplyBots } from './conditions';

export class MessageProcessor {
	constructor(
		private messageFilter: MessageFilter,
		private replyBots: ReplyBotImpl[] = []
	) {}

	async processMessage(message: Message): Promise<void> {
		if (!this.shouldProcessMessage(message)) return;

		try {
			const context = MessageFilter.createContextFromMessage(message);
			const filterResult = this.messageFilter.shouldProcessMessage(context);
			
			if (!filterResult.allowed) {
				logger.debug(`Message filtered: ${filterResult.reason}`);
				return;
			}

			await this.processWithReplyBots(message);
		} catch (error) {
			logger.error('Error processing message:', ensureError(error));
		}
	}

	private shouldProcessMessage(message: Message): boolean {
		if (!message?.author) return false;

		if (message.author.bot) {
			const shouldExclude = shouldExcludeFromReplyBots(message);
			if (shouldExclude) {
				logger.debug(`Bot message excluded: ${message.author.username}`);
				return false;
			}
		}

		return true;
	}

	private async processWithReplyBots(message: Message): Promise<void> {
		if (this.replyBots.length === 0) {
			logger.debug('No reply bots loaded - skipping processing');
			return;
		}

		const results = await Promise.allSettled(
			this.replyBots.map(bot => this.processBotResponse(bot, message))
		);

		this.logProcessingResults(results);
	}

	private async processBotResponse(bot: ReplyBotImpl, message: Message): Promise<{ bot: string; triggered: boolean }> {
		try {
			const shouldRespond = await bot.shouldRespond(message);
			if (shouldRespond) {
				await bot.processMessage(message);
				return { bot: bot.name, triggered: true };
			}
			return { bot: bot.name, triggered: false };
		} catch (error) {
			logger.error(`Error in bot ${bot.name}:`, ensureError(error));
			return { bot: bot.name, triggered: false };
		}
	}

	private logProcessingResults(results: PromiseSettledResult<{ bot: string; triggered: boolean }>[]): void {
		const triggered = results
			.filter((result): result is PromiseFulfilledResult<{ bot: string; triggered: boolean }> => 
				result.status === 'fulfilled' && result.value.triggered
			)
			.map(result => result.value.bot);

		if (triggered.length > 0) {
			logger.debug(`Bots triggered: ${triggered.join(', ')}`);
		}
	}

	updateBots(bots: ReplyBotImpl[]): void {
		this.replyBots = bots;
		logger.debug(`Updated with ${bots.length} reply bots`);
	}
}