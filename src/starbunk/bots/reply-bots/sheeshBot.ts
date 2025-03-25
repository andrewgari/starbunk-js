import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { logger } from '../../../services/logger';
import { SheeshBotConfig } from '../config/sheeshBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class SheeshBot extends ReplyBot {
	public get botIdentity(): BotIdentity {
		return {
			botName: SheeshBotConfig.Name,
			avatarUrl: SheeshBotConfig.Avatars.Default
		};
	}

	public get description(): string {
		return "Responds with 'SHEESH' to messages containing sheesh";
	}

	protected async processMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${message.content.substring(0, 100)}..."`);

		try {
			const content = message.content.toLowerCase();
			const hasSheesh = SheeshBotConfig.Patterns.Default?.test(content);
			logger.debug(`[${this.defaultBotName}] Sheesh pattern match result: ${hasSheesh}`);

			if (hasSheesh) {
				logger.info(`[${this.defaultBotName}] Found sheesh from ${message.author.tag}`);
				const response = SheeshBotConfig.Responses.Default();
				await this.sendReply(message.channel as TextChannel, response);
				logger.debug(`[${this.defaultBotName}] Sent response successfully`);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
			throw error;
		}
	}
}
