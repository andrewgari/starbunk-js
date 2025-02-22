import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';

export default class BabyBot extends ReplyBot {
	private readonly botName = 'BabyBot';
	private readonly avatarUrl = 'https://i.redd.it/qc9qus78dc581.jpg';
	private readonly pattern = /\bbaby\b/i;
	private readonly response = 'https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus-aran.gif';

	getBotName(): string {
		return this.botName;
	}
	getAvatarUrl(): string {
		return this.avatarUrl;
	}
	handleMessage(message: Message<boolean>): void {
		if (message.author.bot) return;

		if (message.content.match(this.pattern)) {
			this.sendReply(message.channel as TextChannel, this.response);
		}
	}
}
