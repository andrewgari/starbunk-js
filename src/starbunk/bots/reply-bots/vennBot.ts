import { isDebugMode } from '@/environment';
import { Message, TextChannel } from 'discord.js';
import userId from '../../../discord/userId';
import { DiscordService } from '../../../services/discordService';
import { logger } from '../../../services/logger';
import Random from '../../../utils/random';
import { BotIdentity } from '../../types/botIdentity';
import { VennBotConfig } from '../config/vennBotConfig';
import ReplyBot from '../replyBot';

// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class VennBot extends ReplyBot {
	public get botIdentity(): BotIdentity {
		try {
			const venn = DiscordService.getInstance().getMemberAsBotIdentity(userId.Venn);
			return {
				avatarUrl: venn.avatarUrl,
				botName: venn.botName
			};
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error getting bot identity:`, error as Error);
			return {
				avatarUrl: VennBotConfig.Avatars.Default,
				botName: VennBotConfig.Name
			};
		}
	}

	public async processMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${message.content.substring(0, 100)}..."`);

		try {
			const content = message.content.toLowerCase();
			const isCringe = VennBotConfig.Patterns.Default?.test(content) ?? false;
			logger.debug(`[${this.defaultBotName}] Cringe check result: ${isCringe}`);

			const targetUserId = isDebugMode() ? userId.Cova : userId.Venn;
			const isTargetUser = message.author.id === targetUserId;
			logger.debug(`[${this.defaultBotName}] Target user check: isTarget=${isTargetUser}`);

			const randomChance = Random.percentChance(5);
			const shouldReply = isCringe || (isTargetUser && randomChance);
			logger.debug(`[${this.defaultBotName}] Reply check: isCringe=${isCringe}, isTarget=${isTargetUser}, randomChance=${randomChance}, shouldReply=${shouldReply}`);

			if (shouldReply) {
				logger.info(`[${this.defaultBotName}] Sending response to ${message.author.tag}`);
				await this.sendReply(message.channel as TextChannel, VennBotConfig.Responses.Default());
				logger.debug(`[${this.defaultBotName}] Response sent successfully`);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
			throw error;
		}
	}
}
