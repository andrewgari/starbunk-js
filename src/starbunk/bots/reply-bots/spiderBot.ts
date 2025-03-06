import { Message, TextChannel } from 'discord.js';
import { SpiderBotConfig } from '../config/SpiderBotConfig';
import ReplyBot from '../replyBot';

export default class SpiderBot extends ReplyBot {
	public readonly botName: string = SpiderBotConfig.Name;
	public readonly avatarUrl: string = SpiderBotConfig.Avatars.Default;

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const hasSpider = SpiderBotConfig.Patterns.Default?.test(content);

		if (hasSpider) {
			this.sendReply(message.channel as TextChannel, SpiderBotConfig.Responses.Default);
		}
	}
}
