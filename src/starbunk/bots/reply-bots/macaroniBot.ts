import { Message, TextChannel } from 'discord.js';
import { logger } from '../../../services/logger';
import { BotIdentity } from '../../types/botIdentity';
import { MacaroniBotConfig } from '../config/macaroniBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class MacaroniBot extends ReplyBot {
	public get botIdentity(): BotIdentity {
		return {
			botName: MacaroniBotConfig.Name,
			avatarUrl: MacaroniBotConfig.Avatars.Default
		}
	}

	public async processMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${message.content.substring(0, 100)}..."`);

		try {
			const mentionsMacaroni = MacaroniBotConfig.Patterns.Macaroni?.test(message.content);
			const mentionsVenn = MacaroniBotConfig.Patterns.Venn?.test(message.content);
			logger.debug(`[${this.defaultBotName}] Pattern matches: macaroni=${mentionsMacaroni}, venn=${mentionsVenn}`);

			if (mentionsMacaroni) {
				logger.info(`[${this.defaultBotName}] Found macaroni mention from ${message.author.tag}`);
				await this.sendReply(message.channel as TextChannel, MacaroniBotConfig.Responses.Macaroni);
				logger.debug(`[${this.defaultBotName}] Sent macaroni response successfully`);
			}

			if (mentionsVenn) {
				logger.info(`[${this.defaultBotName}] Found Venn mention from ${message.author.tag}`);
				await this.sendReply(message.channel as TextChannel, MacaroniBotConfig.Responses.Venn);
				logger.debug(`[${this.defaultBotName}] Sent Venn response successfully`);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
			throw error;
		}
	}
}
