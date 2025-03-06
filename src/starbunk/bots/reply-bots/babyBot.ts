import { Message, TextChannel } from 'discord.js';
import { BabyBotConfig } from '../config/BabyBotConfig';
import ReplyBot from '../replyBot';

export default class BabyBot extends ReplyBot {
	public readonly botName: string = BabyBotConfig.Name;
	public readonly avatarUrl: string = BabyBotConfig.Avatars.Default;

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content.toLowerCase();
		const hasBaby = BabyBotConfig.Patterns.Default?.test(content);

		if (hasBaby) {
			this.sendReply(message.channel as TextChannel, BabyBotConfig.Responses.Default);
		}
	}
}
