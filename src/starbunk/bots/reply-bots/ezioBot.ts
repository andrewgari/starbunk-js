import { Message, TextChannel } from 'discord.js';
import { Service, ServiceId } from '../../../services/services';
import { EzioBotConfig } from '../config/ezioBotConfig';
import ReplyBot from '../replyBot';

@Service({
	id: ServiceId.EzioBot,
	scope: 'singleton'
})
export default class EzioBot extends ReplyBot {
	public readonly botName: string = EzioBotConfig.Name;
	public readonly avatarUrl: string = EzioBotConfig.Avatars.Default;

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const hasEzio = EzioBotConfig.Patterns.Default?.test(content);

		if (hasEzio) {
			this.sendReply(
				message.channel as TextChannel,
				EzioBotConfig.Responses.Default(message.author.displayName)
			);
		}
	}
}
