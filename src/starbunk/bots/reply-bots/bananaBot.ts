import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { logger } from '../../../services/logger';
import { BananaBotConfig } from '../config/bananaBotConfig';
import ReplyBot from '../replyBot';

/**
 * Bot that responds to mentions of bananas with configured responses.
 * Registered automatically by StarbunkClient.registerBots().
 */
export default class BananaBot extends ReplyBot {
	public override get botIdentity(): BotIdentity {
		return {
			botName: BananaBotConfig.Name,
			avatarUrl: BananaBotConfig.Avatars.Default
		};
	}

	protected override async processMessage(message: Message): Promise<void> {
		const truncatedContent = message.content.substring(0, 100);
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${truncatedContent}..."`);

		try {
			await this.handleBananaMention(message);
		} catch (error) {
			const typedError = error instanceof Error ? error : new Error(String(error));
			logger.error(`[${this.defaultBotName}] Error processing message:`, typedError);
			throw typedError;
		}
	}

	/**
	 * Checks for and handles banana mentions in messages.
	 * @param message - The Discord message to process
	 */
	private async handleBananaMention(message: Message): Promise<void> {
		const content = message.content.toLowerCase();
		const pattern = BananaBotConfig.Patterns.Default;

		if (!pattern) {
			logger.warn(`[${this.defaultBotName}] No pattern configured for banana detection`);
			return;
		}

		const hasBanana = pattern.test(content);
		logger.debug(`[${this.defaultBotName}] Banana pattern match result: ${hasBanana}`);

		if (hasBanana) {
			logger.info(`[${this.defaultBotName}] Found banana mention from ${message.author.tag}`);
			const response = BananaBotConfig.Responses.Default();
			await this.sendReply(message.channel as TextChannel, response);
			logger.debug(`[${this.defaultBotName}] Sent response successfully`);
		}
	}
}

