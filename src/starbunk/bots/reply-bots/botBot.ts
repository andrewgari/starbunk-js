import { Message, TextChannel } from 'discord.js';
import { logger } from '../../../services/logger';
import Random from '../../../utils/random';
import { BotIdentity } from '../../types/botIdentity';
import { BotBotConfig } from '../config/botBotConfig';
import ReplyBot from '../replyBot';

export default class BotBot extends ReplyBot {
	protected shouldSkipMessage(message: Message): boolean {
		logger.debug(`[${this.defaultBotName}] Checking if message should be skipped`);
		// BotBot only responds to bot messages
		const shouldSkip = !message.author.bot;
		logger.debug(`[${this.defaultBotName}] Message ${shouldSkip ? 'will be skipped' : 'will be processed'}`);
		return shouldSkip;
	}

	public get botIdentity(): BotIdentity {
		return {
			botName: BotBotConfig.Name,
			avatarUrl: BotBotConfig.Avatars.Default
		};
	}

	public async processMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${message.content.substring(0, 100)}..."`);

		try {
			const shouldRespond = BotBotConfig.Patterns.Default?.test(message.content);
			logger.debug(`[${this.defaultBotName}] Bot mention check result: ${shouldRespond}`);

			if (shouldRespond) {
				// BotBot only responds to bot messages with a 10% chance
				const willRespond = Random.percentChance(10);
				logger.debug(`[${this.defaultBotName}] Response probability check (10%): ${willRespond}`);

				if (willRespond) {
					logger.info(`[${this.defaultBotName}] Responding to bot mention from ${message.author.tag}`);
					await this.sendReply(message.channel as TextChannel, BotBotConfig.Responses.Default);
					logger.debug(`[${this.defaultBotName}] Response sent successfully`);
				} else {
					logger.debug(`[${this.defaultBotName}] Skipping response due to probability check`);
				}
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
			throw error;
		}
	}
}
