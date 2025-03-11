import { Message, TextChannel } from 'discord.js';
import { Service, ServiceId } from '../../../services/services';
import { EzioBotConfig } from '../config/ezioBotConfig';
import ReplyBot from '../replyBot';

@Service({
	id: ServiceId.EzioBot,
	scope: 'singleton'
})
export default class EzioBot extends ReplyBot {
	protected readonly config = EzioBotConfig;
	
	protected get botIdentity(): { userId: string; botName: string; avatarUrl: string } {
		return {
			userId: '',
			botName: EzioBotConfig.Name,
			avatarUrl: EzioBotConfig.Avatars.Default
		};
	}

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
