import { Message, TextChannel } from 'discord.js';
import { CheckBotConfig } from '../config/CheckBotConfig';
import ReplyBot from '../replyBot';

export default class CheckBot extends ReplyBot {
	public readonly botName: string = CheckBotConfig.Name;
	public readonly avatarUrl: string = CheckBotConfig.Avatars.Default;

	defaultBotName(): string {
		return 'CheckBot';
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const hasCheck = CheckBotConfig.Patterns.Default?.test(content);

		if (hasCheck) {
			this.sendReply(message.channel as TextChannel, CheckBotConfig.Responses.Default(content));
		}
	}
}
