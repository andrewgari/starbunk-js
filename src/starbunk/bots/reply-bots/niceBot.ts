import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from './botConstants';

export default class NiceBot extends ReplyBot {
	public readonly botName: string = getBotName('Nice');
	public readonly avatarUrl: string = getBotAvatar('Nice', 'Default');

	handleMessage(message: Message<boolean>): void {
		if (getBotPattern('Nice', 'Default')?.test(message.content)) {
			this.sendReply(message.channel as TextChannel, getBotResponse('Nice', 'Default'));
		}
	}
}
