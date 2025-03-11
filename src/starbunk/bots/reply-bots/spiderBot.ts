import { Message, TextChannel } from 'discord.js';
import { Service, ServiceId } from '../../../services/services';
import { BotIdentity } from '../botIdentity';
import { SpiderBotConfig } from '../config/spiderBotConfig';
import ReplyBot from '../replyBot';

@Service({
	id: ServiceId.SpiderBot,
	scope: 'singleton'
})
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
		const hasSpider = SpiderBotConfig.Patterns.Default?.test(content);

		if (hasSpider) {
			this.sendReply(message.channel as TextChannel, {
				botIdentity: this.botIdentity,
				content: SpiderBotConfig.getRandomCheekyResponse()
			});
		}
	}
}
