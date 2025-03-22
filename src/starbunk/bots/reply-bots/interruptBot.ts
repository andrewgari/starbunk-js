import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { DiscordService } from '../../../services/discordService';
import { logger } from '../../../services/logger';
import Random from '../../../utils/random';
import { InterruptBotConfig } from '../config/interruptBotConfig';
import ReplyBot from '../replyBot';

export default class InterruptBot extends ReplyBot {
	public get botIdentity(): BotIdentity {
		return DiscordService.getInstance().getRandomMemberAsBotIdentity();
	}

	public async processMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${message.content.substring(0, 100)}..."`);

		try {
			// Base chance of interruption - percentChance already handles DEBUG_MODE
			const baseInterruptChance = 1; // 1% chance in normal mode, 100% in debug mode
			const shouldInterrupt = Random.percentChance(baseInterruptChance);

			// For debugging, log the effective chance (will be 100% in debug mode)
			const effectiveChance = process.env.DEBUG_MODE === 'true' ? 100 : baseInterruptChance;
			logger.debug(`[${this.defaultBotName}] Interrupt check: base=${baseInterruptChance}%, effective=${effectiveChance}%, result=${shouldInterrupt}`);

			if (!shouldInterrupt) {
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
