import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { logger } from '../../../services/logger';
import { MusicCorrectBotConfig } from '../config/musicCorrectBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class MusicCorrectBot extends ReplyBot {
	public get defaultBotName(): string {
		return 'MusicCorrectBot';
	}

	public get botIdentity(): BotIdentity {
		return {
			botName: MusicCorrectBotConfig.Name,
			avatarUrl: MusicCorrectBotConfig.Avatars.Default
		};
	}

	constructor() {
		super();
		logger.debug(`[${this.defaultBotName}] Initializing MusicCorrectBot`);
		this.skipBotMessages = false;
		logger.debug(`[${this.defaultBotName}] Bot messages will not be skipped`);
	}

	// Allow all messages, including bot messages
	protected override shouldSkipMessage(_message: Message): boolean {
		logger.debug(`[${this.defaultBotName}] Checking if message should be skipped (always false)`);
		return false;
	}

	protected async processMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${message.content.substring(0, 100)}..."`);

		try {
			const content = message.content.toLowerCase();
			const hasMusic = MusicCorrectBotConfig.Patterns.Default?.test(content);
			logger.debug(`[${this.defaultBotName}] Music pattern match result: ${hasMusic}`);

			if (hasMusic) {
				logger.info(`[${this.defaultBotName}] Found music correction opportunity from ${message.author.tag}`);
				const response = MusicCorrectBotConfig.Responses.Default(message.author.id);
				await this.sendReply(message.channel as TextChannel, response);
				logger.debug(`[${this.defaultBotName}] Sent music correction response successfully`);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
			throw error;
		}
	}
}
