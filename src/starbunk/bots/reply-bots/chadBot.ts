import { Message, TextChannel } from 'discord.js';
import userId from '../../../discord/userId';
import { getDiscordService } from '../../../services/bootstrap';
import { logger } from '../../../services/logger';
import { ChadBotConfig } from '../config/chadBotConfig';
import ReplyBot from '../replyBot';

export default class ChadBot extends ReplyBot {
	protected override responseRate = 1; // 1% chance to respond
	protected override skipBotMessages = true;

	public override get botIdentity() {
		try {
			return getDiscordService().getBotProfile(userId.Chad);
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error getting bot identity:`, error as Error);
			return {
				avatarUrl: ChadBotConfig.Avatars.Default,
				botName: ChadBotConfig.Name
			};
		}
	}

	public async processMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${message.content.substring(0, 100)}..."`);

		try {
			if (!this.shouldTriggerResponse()) {
				logger.debug(`[${this.defaultBotName}] Skipping response based on random chance`);
				return;
			}

			logger.info(`[${this.defaultBotName}] Responding to message from ${message.author.tag}`);
			await this.sendReply(message.channel as TextChannel, ChadBotConfig.Responses.Default);
			logger.debug(`[${this.defaultBotName}] Response sent successfully`);
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
			throw error;
		}
	}
}
