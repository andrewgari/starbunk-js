import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { logger } from '../../../services/logger';
import { EzioBotConfig } from '../config/ezioBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class EzioBot extends ReplyBot {
	public get defaultBotName(): string {
		return 'Ezio Auditore da Firenze';
	}

	public get botIdentity(): BotIdentity {
		return {
			botName: EzioBotConfig.Name,
			avatarUrl: EzioBotConfig.Avatars.Default
		};
	}

	protected async processMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${message.content.substring(0, 100)}..."`);

		try {
			const content = message.content.toLowerCase();
			const hasEzio = EzioBotConfig.Patterns.Default?.test(content);
			logger.debug(`[${this.defaultBotName}] Ezio pattern match result: ${hasEzio}`);

			if (hasEzio) {
				logger.info(`[${this.defaultBotName}] Found Ezio mention from ${message.author.tag}`);
				const response = EzioBotConfig.Responses.Default(message.author.displayName);
				await this.sendReply(message.channel as TextChannel, response);
				logger.debug(`[${this.defaultBotName}] Sent response successfully`);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
			throw error;
		}
	}
}
