import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from '../botConstants';

export default class BabyBot extends ReplyBot {
	public readonly botName: string = getBotName('Baby') ?? 'Baby Bot';
	public readonly avatarUrl: string = getBotAvatar('Baby', 'Default');

	handleMessage(message: Message<boolean>): void {
		if (message.author.bot) return;
		const pattern = getBotPattern('Baby', 'Default');
		if (pattern && pattern.test(message.content)) {
			this.sendReply(message.channel as TextChannel, getBotResponse('Baby', 'Default'));
		}
	}
}
