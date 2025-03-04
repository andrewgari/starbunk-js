import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from '../botConstants';

export default class SpiderBot extends ReplyBot {
	public readonly botName: string = getBotName('Spider');
	public readonly avatarUrl: string = getBotAvatar('Spider', 'Default');

	handleMessage(message: Message<boolean>): void {
		if (message.author.bot) return;

		if (getBotPattern('Spider', 'Default')?.test(message.content)) {
			this.sendReply(message.channel as TextChannel, getBotResponse('Spider', 'Default'));
		}
	}
}
