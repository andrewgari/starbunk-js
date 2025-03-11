import { Message, TextChannel } from 'discord.js';
import { Service, ServiceId } from '../../../services/services';
import { GundamBotConfig } from '../config/gundamBotConfig';
import ReplyBot from '../replyBot';

@Service({
	id: ServiceId.GundamBot,
	scope: 'singleton'
})
export default class GundamBot extends ReplyBot {
	protected get botIdentity(): { userId: string; botName: string; avatarUrl: string } {
		return {
			userId: '',
			botName: GundamBotConfig.Name,
			avatarUrl: GundamBotConfig.Avatars.Default
		};
	}

	defaultBotName(): string {
		return 'GundamBot';
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const hasGundam = GundamBotConfig.Patterns.Default?.test(content);

		if (hasGundam) {
			this.sendReply(message.channel as TextChannel, {
				content: GundamBotConfig.Responses.Default
			});
		}
	}
}
