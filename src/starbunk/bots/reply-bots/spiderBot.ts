import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { SpiderBotConfig } from '../config/spiderBotConfig';
import ReplyBot from '../replyBot';

// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class SpiderBot extends ReplyBot {
	public get defaultBotName(): string {
		return 'SpiderBot';
	}

	public get botIdentity(): BotIdentity {
		return {
			avatarUrl: SpiderBotConfig.Avatars.Default,
			botName: SpiderBotConfig.Name
		};
	}

	public async handleMessage(message: Message<boolean>): Promise<void> {
		const hasCorrectSpelling = SpiderBotConfig.Patterns.Correct?.test(message.content);
		const hasIncorrectSpelling = SpiderBotConfig.Patterns.Default?.test(message.content);

		// Only respond if there's a match
		if (hasCorrectSpelling || hasIncorrectSpelling) {
			if (hasCorrectSpelling) {
				this.sendReply(message.channel as TextChannel, SpiderBotConfig.getRandomPositiveResponse());
			} else if (hasIncorrectSpelling) {
				this.sendReply(message.channel as TextChannel, SpiderBotConfig.getRandomCheekyResponse());
			}
		}
	}
}
