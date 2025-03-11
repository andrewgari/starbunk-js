import { Message, TextChannel } from 'discord.js';
import { Service, ServiceId } from '../../../services/services';
import { NiceBotConfig } from '../config/niceBotConfig';
import ReplyBot from '../replyBot';

@Service({
	id: ServiceId.NiceBot,
	scope: 'singleton'
})
export default class NiceBot extends ReplyBot {
	public readonly botName: string = NiceBotConfig.Name;
	public readonly avatarUrl: string = NiceBotConfig.Avatars.Default;

	defaultBotName(): string {
		return 'NiceBot';
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const hasNice = NiceBotConfig.Patterns.Default?.test(content);

		if (hasNice) {
			this.sendReply(message.channel as TextChannel, NiceBotConfig.Responses.Default);
		}
	}
}
