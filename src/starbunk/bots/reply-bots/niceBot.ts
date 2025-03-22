import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { logger } from '../../../services/logger';
import { NiceBotConfig } from '../config/niceBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class NiceBot extends ReplyBot {
	public get botIdentity(): BotIdentity {
		return {
			botName: NiceBotConfig.Name,
			avatarUrl: NiceBotConfig.Avatars.Default
		};
	}

	protected async processMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${message.content.substring(0, 100)}..."`);

		try {
			const content = message.content.toLowerCase();
			const hasNice = NiceBotConfig.Patterns.Default?.test(content);
			logger.debug(`[${this.defaultBotName}] Nice pattern match result: ${hasNice}`);

			if (hasNice) {
				logger.info(`[${this.defaultBotName}] Found nice from ${message.author.tag}`);
				await this.sendReply(message.channel as TextChannel, NiceBotConfig.Responses.Default);
				logger.debug(`[${this.defaultBotName}] Sent response successfully`);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
			throw error;
		}
	}
}
