import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { logger } from '../../../services/logger';
import { GuyBotConfig } from '../config/guyBotConfig';
import ReplyBot from '../replyBot';

/**
 * Bot that responds to mentions of "guy" with configured responses.
 * Registered automatically by StarbunkClient.registerBots().
 */
export default class GuyBot extends ReplyBot {
	public override get botIdentity(): BotIdentity {
		return {
			botName: GuyBotConfig.Name,
			avatarUrl: GuyBotConfig.Avatars.Default
		};
	}

	protected override async processMessage(message: Message): Promise<void> {
		const truncatedContent = message.content.substring(0, 100);
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${truncatedContent}..."`);

		try {
			await this.handleGuyMention(message);
		} catch (error) {
			const typedError = error instanceof Error ? error : new Error(String(error));
			logger.error(`[${this.defaultBotName}] Error processing message:`, typedError);
			throw typedError;
		}
	}

	/**
	 * Checks for and handles "guy" mentions in messages.
	 * @param message - The Discord message to process
	 */
	private async handleGuyMention(message: Message): Promise<void> {
		const content = message.content.toLowerCase();
		const pattern = GuyBotConfig.Patterns.Default;

		if (!pattern) {
			logger.warn(`[${this.defaultBotName}] No pattern configured for guy detection`);
			return;
		}

		const hasGuy = pattern.test(content);
		logger.debug(`[${this.defaultBotName}] Guy pattern match result: ${hasGuy}`);

		if (hasGuy) {
			logger.info(`[${this.defaultBotName}] Found guy mention from ${message.author.tag}`);
			const response = GuyBotConfig.Responses.Default();
			await this.sendReply(message.channel as TextChannel, response);
			logger.debug(`[${this.defaultBotName}] Sent response successfully`);
		}
	}
}
