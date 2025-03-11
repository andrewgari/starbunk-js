import { Message, TextChannel } from 'discord.js';
import { Service, ServiceId } from '../../../services/services';
import { SpiderBotConfig } from '../config/spiderBotConfig';
import ReplyBot from '../replyBot';

@Service({
	id: ServiceId.SpiderBot,
	scope: 'singleton'
})
export default class SpiderBot extends ReplyBot {
	public readonly botName: string = SpiderBotConfig.Name;
	public readonly avatarUrl: string = SpiderBotConfig.Avatars.Default;

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const hasSpider = SpiderBotConfig.Patterns.Default?.test(content);

		if (hasSpider) {
			this.sendReply(message.channel as TextChannel, SpiderBotConfig.getRandomCheekyResponse());
		}
	}
}
