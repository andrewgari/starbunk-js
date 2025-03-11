import { Message, TextChannel } from 'discord.js';
import { Service, ServiceId } from '../../../services/services';
import { GundamBotConfig } from '../config/gundamBotConfig';
import ReplyBot from '../replyBot';

@Service({
	id: ServiceId.GundamBot,
	scope: 'singleton'
})
export default class GundamBot extends ReplyBot {
	public readonly botName: string = GundamBotConfig.Name;
	public readonly avatarUrl: string = GundamBotConfig.Avatars.Default;

	defaultBotName(): string {
		return 'GundamBot';
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const hasGundam = GundamBotConfig.Patterns.Default?.test(content);

		if (hasGundam) {
			this.sendReply(message.channel as TextChannel, GundamBotConfig.Responses.Default);
		}
	}
}
