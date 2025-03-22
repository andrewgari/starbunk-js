import { Message, TextChannel } from 'discord.js';
import { logger } from '../../../services/logger';
import { BotIdentity } from '../../types/botIdentity';
import { CheckBotConfig } from '../config/checkBotConfig';
import ReplyBot from '../replyBot';

// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class CheckBot extends ReplyBot {
	public get botIdentity(): BotIdentity {
		return {
			botName: CheckBotConfig.Name,
			avatarUrl: CheckBotConfig.Avatars.Default
		};
	}

	public async processMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${message.content.substring(0, 100)}..."`);

		try {
			const shouldCheck = CheckBotConfig.Patterns.Default?.test(message.content);
			logger.debug(`[${this.defaultBotName}] Check pattern match result: ${shouldCheck}`);

			if (shouldCheck) {
				logger.info(`[${this.defaultBotName}] Responding to check from ${message.author.tag}`);
				const response = typeof CheckBotConfig.Responses.Default === 'function'
					? CheckBotConfig.Responses.Default(message.content)
					: CheckBotConfig.Responses.Default;
				await this.sendReply(message.channel as TextChannel, response);
				logger.debug(`[${this.defaultBotName}] Check response sent successfully`);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
			throw error;
		}
	}
}
