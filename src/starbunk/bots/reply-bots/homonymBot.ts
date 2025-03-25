import { Message, TextChannel } from 'discord.js';
import { logger } from '../../../services/logger';
import { BotIdentity } from '../../types/botIdentity';
import { HomonymBotConfig } from '../config/homonymBotConfig';
import ReplyBot from '../replyBot';

interface HomonymMatch {
	word: string;
	correction: string;
}

// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class HomonymBot extends ReplyBot {
	protected override responseRate = 15; // Set 15% response rate

	protected override shouldSkipMessage(_message: Message): boolean {
		return false; // Never skip messages, we want to check all messages for homonyms
	}

	public get botIdentity(): BotIdentity {
		return {
			botName: HomonymBotConfig.Name,
			avatarUrl: HomonymBotConfig.Avatars.Default
		};
	}

	public async processMessage(message: Message): Promise<void> {
		logger.debug(`[${this.defaultBotName}] Processing message from ${message.author.tag}: "${message.content.substring(0, 100)}..."`);

		try {
			const pair = this.findMatchingHomonymPair(message.content);
			if (pair) {
				if (!this.shouldTriggerResponse()) {
					logger.debug(`[${this.defaultBotName}] Found match but skipping due to probability check`);
					return;
				}

				logger.info(`[${this.defaultBotName}] Found homonym match: "${pair.word}" -> "${pair.correction}"`);
				await this.sendReply(message.channel as TextChannel, pair.correction);
				logger.debug(`[${this.defaultBotName}] Sent correction successfully`);
			} else {
				logger.debug(`[${this.defaultBotName}] No homonym matches found`);
			}
		} catch (error) {
			logger.error(`[${this.defaultBotName}] Error processing message:`, error as Error);
			throw error;
		}
	}

	private findMatchingHomonymPair(content: string): HomonymMatch | null {
		const words = content.toLowerCase().split(/\s+/);

		for (const pair of HomonymBotConfig.HomonymPairs) {
			for (const word of pair.words) {
				if (words.includes(word)) {
					return {
						word,
						correction: pair.corrections[word]
					};
				}
			}
		}

		return null;
	}
}
