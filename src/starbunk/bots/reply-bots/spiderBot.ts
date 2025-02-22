import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';

export default class SpiderBot extends ReplyBot {
	private readonly botName = 'Spider-Bot';
	private readonly avatarUrl = 'https://i.pinimg.com/736x/33/e0/06/33e00653eb485455ce5121b413b26d3b.jpg';
	private readonly pattern = /\bspider\s?man\b/i;
	private readonly response = "Hey, it's \"**Spider-Man**\"! Don't forget the hyphen! Not Spiderman, that's dumb";

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
