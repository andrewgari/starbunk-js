import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { SpiderBotConfig } from '../config/spiderBotConfig';
import ReplyBot from '../replyBot';

// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class SpiderBot extends ReplyBot {
	public get botIdentity(): BotIdentity {
		return {
			botName: SpiderBotConfig.Name,
			avatarUrl: SpiderBotConfig.Avatars.Default
		};
	}

	protected async processMessage(message: Message): Promise<void> {
		const hasCorrectSpelling = SpiderBotConfig.Patterns.Correct?.test(message.content);
		const hasIncorrectSpelling = SpiderBotConfig.Patterns.Default?.test(message.content);

		// Only respond if there's a match
		if (hasCorrectSpelling || hasIncorrectSpelling) {
			if (hasCorrectSpelling) {
				await this.sendReply(message.channel as TextChannel, SpiderBotConfig.getRandomPositiveResponse());
			} else if (hasIncorrectSpelling) {
				await this.sendReply(message.channel as TextChannel, SpiderBotConfig.getRandomCheekyResponse());
			}
		}
	}
}
