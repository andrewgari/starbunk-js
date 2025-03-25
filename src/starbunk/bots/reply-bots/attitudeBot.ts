import { BotIdentity } from "@/starbunk/types/botIdentity";
import { Message, TextChannel } from "discord.js";
import { logger } from '../../../services/logger';
import { AttitudeBotConfig } from "../config/attitudeBotConfig";
import ReplyBot from "../replyBot";
// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class AttitudeBot extends ReplyBot {
	public get botIdentity(): BotIdentity {
		return {
			botName: AttitudeBotConfig.Name,
			avatarUrl: AttitudeBotConfig.Avatars.Default
		};
	}

	protected async processMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${message.content.substring(0, 100)}..."`);

		try {
			const content = message.content.toLowerCase();
			const hasAttitude = AttitudeBotConfig.Patterns.Default?.test(content);
			logger.debug(`[${this.defaultBotName}] Attitude pattern match result: ${hasAttitude}`);

			if (hasAttitude) {
				logger.info(`[${this.defaultBotName}] Found attitude from ${message.author.tag}`);
				await this.sendReply(message.channel as TextChannel, AttitudeBotConfig.Responses.Default);
				logger.debug(`[${this.defaultBotName}] Sent response successfully`);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
			throw error;
		}
	}
}
