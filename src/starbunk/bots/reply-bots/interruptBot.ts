import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { DiscordService } from '../../../services/discordService';
import { logger } from '../../../services/logger';
import { InterruptBotConfig } from '../config/interruptBotConfig';
import ReplyBot from '../replyBot';

export default class InterruptBot extends ReplyBot {
	protected override responseRate = 1; // 1% chance in normal mode, 100% in debug mode

	public override get botIdentity(): BotIdentity {
		try {
			return DiscordService.getInstance().getRandomBotProfile();
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error getting bot identity:`, error as Error);
			return {
				avatarUrl: InterruptBotConfig.Avatars.Default,
				botName: InterruptBotConfig.Name
			};
		}
	}

	public async processMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${message.content.substring(0, 100)}..."`);

		try {
			if (!this.shouldTriggerResponse()) {
				logger.debug(`[${this.defaultBotName}] Skipping interrupt based on random chance`);
				return;
			}

			logger.info(`[${this.defaultBotName}] Interrupting message from ${message.author.tag}`);
			const interruptedMessage = InterruptBotConfig.Responses.createInterruptedMessage(message.content);
			await this.sendReply(message.channel as TextChannel, interruptedMessage);
			logger.debug(`[${this.defaultBotName}] Interrupt response sent successfully`);
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
			throw error;
		}
	}
}
