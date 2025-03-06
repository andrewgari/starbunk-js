import { Message, TextChannel } from 'discord.js';
import { ChaosBotConfig } from '../config/ChaosBotConfig';
import ReplyBot from '../replyBot';

export default class ChaosBot extends ReplyBot {
	public readonly botName: string = ChaosBotConfig.Name;
	public readonly avatarUrl: string = ChaosBotConfig.Avatars.Default;

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content.toLowerCase();
		const hasChaos = ChaosBotConfig.Patterns.Default?.test(content);

		if (hasChaos) {
			this.sendReply(message.channel as TextChannel, ChaosBotConfig.Responses.Default);
		}
	}
}
