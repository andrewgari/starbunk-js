import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';
import Random from '../../../utils/random';

export default class BotBot extends ReplyBot {
	private readonly defaultAvatarURL: string = 'https://cdn-icons-png.flaticon.com/512/4944/4944377.png';
	private readonly defaultName: string = 'Botbot';
	private readonly response: string = 'Hello fellow bot!';

	getBotName(): string {
		return this.defaultName;
	}
	getAvatarUrl(): string {
		return this.defaultAvatarURL;
	}
	handleMessage(message: Message<boolean>): void {
		if (this.isSelf(message)) return;

		if (message.author.bot && Random.percentChance(10)) {
			this.sendReply(message.channel as TextChannel, this.response);
		}
	}
}
