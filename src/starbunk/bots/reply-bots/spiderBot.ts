import { Message, TextChannel } from 'discord.js';
;
import { BotIdentity } from '../botIdentity';
import { SpiderBotConfig } from '../config/spiderBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class SpiderBot extends ReplyBot {
	protected get botIdentity(): BotIdentity {
		return {
			userId: '',
			avatarUrl: SpiderBotConfig.Avatars.Default,
			botName: SpiderBotConfig.Name
		};
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const hasCorrectSpelling = SpiderBotConfig.Patterns.Correct?.test(content);
		const hasIncorrectSpelling = SpiderBotConfig.Patterns.Default?.test(content);

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
