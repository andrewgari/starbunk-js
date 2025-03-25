import { Message, TextChannel } from 'discord.js';
import { logger } from '../../../services/logger';
import { BotIdentity } from '../../types/botIdentity';
import { SpiderBotConfig } from '../config/spiderBotConfig';
import ReplyBot from '../replyBot';

// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class SpiderBot extends ReplyBot {
	public get defaultBotName(): string {
		return 'Spider-Bot';
	}
	public get botIdentity(): BotIdentity {
		return {
			botName: SpiderBotConfig.Name,
			avatarUrl: SpiderBotConfig.Avatars.Default
		};
	}

	public async processMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${message.content.substring(0, 100)}..."`);

		try {
			const hasCorrectSpelling = SpiderBotConfig.Patterns.Correct?.test(message.content);
			const hasIncorrectSpelling = SpiderBotConfig.Patterns.Default?.test(message.content);
			logger.debug(`[${this.defaultBotName}] Spider mention check: correct=${hasCorrectSpelling}, incorrect=${hasIncorrectSpelling}`);

			// Only respond if there's a match
			if (hasCorrectSpelling || hasIncorrectSpelling) {
				if (hasCorrectSpelling) {
					logger.info(`[${this.defaultBotName}] Detected correct spider spelling from ${message.author.tag}`);
					await this.sendReply(message.channel as TextChannel, SpiderBotConfig.getRandomPositiveResponse());
					logger.debug(`[${this.defaultBotName}] Sent positive response`);
				} else if (hasIncorrectSpelling) {
					logger.info(`[${this.defaultBotName}] Detected incorrect spider spelling from ${message.author.tag}`);
					await this.sendReply(message.channel as TextChannel, SpiderBotConfig.getRandomCheekyResponse());
					logger.debug(`[${this.defaultBotName}] Sent cheeky response`);
				}
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
			throw error;
		}
	}
}
