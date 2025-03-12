import { Message, TextChannel } from 'discord.js';
import { BabyBotConfig } from '../config/babyBotConfig';
import ReplyBot from '../replyBot';

// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class BabyBot extends ReplyBot {
	protected readonly config = BabyBotConfig;

	protected get botIdentity(): { userId: string; botName: string; avatarUrl: string } {
		return {
			userId: '',
			botName: BabyBotConfig.Name,
			avatarUrl: BabyBotConfig.Avatars.Default
		};
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content.toLowerCase();
		const hasBaby = BabyBotConfig.Patterns.Default?.test(content);

		if (hasBaby) {
			this.sendReply(message.channel as TextChannel, BabyBotConfig.Responses.Default);
		}
	}
}
