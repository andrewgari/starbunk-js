import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { logger } from '../../../services/logger';
import { ChaosBotConfig } from '../config/chaosBotConfig';
import ReplyBot from '../replyBot';

// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class ChaosBot extends ReplyBot {
	public get botIdentity(): BotIdentity {
		return {
			botName: ChaosBotConfig.Name,
			avatarUrl: ChaosBotConfig.Avatars.Default
		};
	}

	protected async processMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${message.content.substring(0, 100)}..."`);

		try {
			const content = message.content.toLowerCase();
			const hasChaos = ChaosBotConfig.Patterns.Default?.test(content);
			logger.debug(`[${this.defaultBotName}] Chaos pattern match result: ${hasChaos}`);

			if (hasChaos) {
				logger.info(`[${this.defaultBotName}] Found chaos mention from ${message.author.tag}`);
				await this.sendReply(message.channel as TextChannel, ChaosBotConfig.Responses.Default);
				logger.debug(`[${this.defaultBotName}] Sent response successfully`);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
			throw error;
		}
	}
}
