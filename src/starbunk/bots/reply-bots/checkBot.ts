import { Message, TextChannel } from 'discord.js';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from '../botConstants';
import ReplyBot from '../replyBot';
export default class BabyBot extends ReplyBot {
	public readonly botName = getBotName('Check');
	public readonly avatarUrl = getBotAvatar('Check', 'Default');

	handleMessage(message: Message<boolean>): void {
		if (message.author.bot) return;

		if (getBotPattern('Check', 'Default')?.test(message.content)) {
			this.sendReply(message.channel as TextChannel, getBotResponse('Check', 'Default', message.content));
		}
	}
}
