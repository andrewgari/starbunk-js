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
		const hasCorrectSpelling = SpiderBotConfig.Patterns.Correct?.test(content);
		const hasIncorrectSpelling = SpiderBotConfig.Patterns.Default?.test(content);

		if (hasCorrectSpelling) {
			this.sendReply(message.channel as TextChannel, SpiderBotConfig.getRandomPositiveResponse());
		} else if (hasIncorrectSpelling) {
			this.sendReply(message.channel as TextChannel, SpiderBotConfig.getRandomCheekyResponse());
		}
	}
}
