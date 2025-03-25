import { Message, TextChannel } from 'discord.js';
import { logger } from '../../../services/logger';
import { BotIdentity } from '../../types/botIdentity';
import { BotBotConfig } from '../config/botBotConfig';
import ReplyBot from '../replyBot';

export default class BotBot extends ReplyBot {
	constructor() {
		super();
		this.responseRate = 10;
	}

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
				if (!this.shouldTriggerResponse()) {
					logger.debug(`[${this.defaultBotName}] Skipping response due to probability check`);
					return;
				}

				logger.info(`[${this.defaultBotName}] Responding to bot mention from ${message.author.tag}`);
				await this.sendReply(message.channel as TextChannel, BotBotConfig.Responses.Default);
				logger.debug(`[${this.defaultBotName}] Response sent successfully`);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
			throw error;
		}
	}
}
