import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { logger } from '../../../services/logger';
import { BabyBotConfig } from '../config/babyBotConfig';
import ReplyBot from '../replyBot';

// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class BabyBot extends ReplyBot {
	public get botIdentity(): BotIdentity {
		return {
			botName: BabyBotConfig.Name,
			avatarUrl: BabyBotConfig.Avatars.Default
		};
	}

	protected async processMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${message.content.substring(0, 100)}..."`);

		try {
			const content = message.content.toLowerCase();
			const hasBaby = BabyBotConfig.Patterns.Default?.test(content);
			logger.debug(`[${this.defaultBotName}] Baby pattern match result: ${hasBaby}`);

			if (hasBaby) {
				logger.info(`[${this.defaultBotName}] Found baby mention from ${message.author.tag}`);
				await this.sendReply(message.channel as TextChannel, BabyBotConfig.Responses.Default);
				logger.debug(`[${this.defaultBotName}] Sent response successfully`);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
			throw error;
		}
	}
}
