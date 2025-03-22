import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { logger } from '../../../services/logger';
import { GundamBotConfig } from '../config/gundamBotConfig';
import ReplyBot from '../replyBot';

/**
 * Bot that responds to mentions of Gundam with configured responses.
 * Registered automatically by StarbunkClient.registerBots().
 */
export default class GundamBot extends ReplyBot {
	public override get botIdentity(): BotIdentity {
		return {
			botName: GundamBotConfig.Name,
			avatarUrl: GundamBotConfig.Avatars.Default
		};
	}

	protected override async processMessage(message: Message): Promise<void> {
		const truncatedContent = message.content.substring(0, 100);
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${truncatedContent}..."`);

		try {
			await this.handleGundamMention(message);
		} catch (error) {
			const typedError = error instanceof Error ? error : new Error(String(error));
			logger.error(`[${this.defaultBotName}] Error processing message:`, typedError);
			throw typedError;
		}
	}

	/**
	 * Checks for and handles Gundam mentions in messages.
	 * @param message - The Discord message to process
	 */
	private async handleGundamMention(message: Message): Promise<void> {
		const content = message.content.toLowerCase();
		const pattern = GundamBotConfig.Patterns.Default;

		if (!pattern) {
			logger.warn(`[${this.defaultBotName}] No pattern configured for Gundam detection`);
			return;
		}

		const hasGundam = pattern.test(content);
		logger.debug(`[${this.defaultBotName}] Gundam pattern match result: ${hasGundam}`);

		if (hasGundam) {
			logger.info(`[${this.defaultBotName}] Found Gundam mention from ${message.author.tag}`);
			await this.sendReply(message.channel as TextChannel, GundamBotConfig.Responses.Default);
			logger.debug(`[${this.defaultBotName}] Sent response successfully`);
		}
	}
}
