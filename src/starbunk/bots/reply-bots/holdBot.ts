import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from './botConstants';

export default class HoldBot extends ReplyBot {
	public readonly botName: string = getBotName('Hold');
	public readonly avatarUrl: string = getBotAvatar('Hold');

	handleMessage(message: Message<boolean>): void {
		if (message.author.bot) return;

		if (getBotPattern('Hold', 'Default')?.test(message.content)) {
			this.sendReply(message.channel as TextChannel, getBotResponse('Hold', 'Default'));
		}
	}
}
