import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { logger } from '../../../services/logger';
import { PickleBotConfig } from '../config/pickleBotConfig';
import ReplyBot from '../replyBot';

/**
 * Bot that responds to mentions of pickles with configured responses.
 * Registered automatically by StarbunkClient.registerBots().
 */
export default class PickleBot extends ReplyBot {
	public override get botIdentity(): BotIdentity {
		return {
			botName: PickleBotConfig.Name,
			avatarUrl: PickleBotConfig.Avatars.Default
		};
	}

	protected override async processMessage(message: Message): Promise<void> {
		const truncatedContent = message.content.substring(0, 100);
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${truncatedContent}..."`);

		try {
			await this.handlePickleMention(message);
		} catch (error) {
			const typedError = error instanceof Error ? error : new Error(String(error));
			logger.error(`[${this.defaultBotName}] Error processing message:`, typedError);
			throw typedError;
		}
	}

	/**
	 * Checks for and handles pickle mentions in messages.
	 * @param message - The Discord message to process
	 */
	private async handlePickleMention(message: Message): Promise<void> {
		const content = message.content.toLowerCase();
		const pattern = PickleBotConfig.Patterns.Default;

		if (!pattern) {
			logger.warn(`[${this.defaultBotName}] No pattern configured for pickle detection`);
			return;
		}

		const hasPickle = pattern.test(content);
		logger.debug(`[${this.defaultBotName}] Pickle pattern match result: ${hasPickle}`);

		if (hasPickle) {
			logger.info(`[${this.defaultBotName}] Found pickle mention from ${message.author.tag}`);
			await this.sendReply(message.channel as TextChannel, PickleBotConfig.Responses.Default);
			logger.debug(`[${this.defaultBotName}] Sent response successfully`);
		}
	}
}
