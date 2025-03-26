import { DiscordService } from '@/services/discordService';
import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { logger } from '../../../services/logger';
import { SigGreatBotConfig } from '../config/sigGreatBotConfig';
import ReplyBot from '../replyBot';

export default class SigGreatBot extends ReplyBot {
	public override get botIdentity(): BotIdentity {
		try {
			logger.debug(`[${this.defaultBotName}] Getting random member as bot identity`);
			return DiscordService.getInstance().getRandomBotProfile();
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error getting bot identity:`, error as Error);
			return {
				avatarUrl: SigGreatBotConfig.Avatars.Default,
				botName: SigGreatBotConfig.Name
			};
		}
	}

	public async processMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${message.content.substring(0, 100)}..."`);

		try {
			const hasSigGreat = SigGreatBotConfig.Patterns.Default?.test(message.content);
			logger.debug(`[${this.defaultBotName}] SigGreat pattern match result: ${hasSigGreat}`);

			if (hasSigGreat) {
				logger.info(`[${this.defaultBotName}] Found SigGreat mention from ${message.author.tag}`);
				await this.sendReply(message.channel as TextChannel, SigGreatBotConfig.Responses.Default);
				logger.debug(`[${this.defaultBotName}] Sent response successfully`);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
			throw error;
		}
	}
}
