import { Message, TextChannel } from 'discord.js';
;
import { GundamBotConfig } from '../config/gundamBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
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
