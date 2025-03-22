import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { logger } from '../../../services/logger';
import { HoldBotConfig } from '../config/holdBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class HoldBot extends ReplyBot {
	public get defaultBotName(): string {
		return 'HoldBot';
	}

	public get botIdentity(): BotIdentity {
		return {
			botName: HoldBotConfig.Name,
			avatarUrl: HoldBotConfig.Avatars.Default
		};
	}

	protected async processMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${message.content.substring(0, 100)}..."`);

		try {
			const content = message.content.toLowerCase();
			const hasHold = HoldBotConfig.Patterns.Default?.test(content);
			logger.debug(`[${this.defaultBotName}] Hold pattern match result: ${hasHold}`);

			if (hasHold) {
				logger.info(`[${this.defaultBotName}] Found hold mention from ${message.author.tag}`);
				await this.sendReply(message.channel as TextChannel, HoldBotConfig.Responses.Default);
				logger.debug(`[${this.defaultBotName}] Sent response successfully`);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
			throw error;
		}
	}
}
