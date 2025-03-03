import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from './botConstants';

export default class GundamBot extends ReplyBot {
	public readonly botName: string = getBotName('Gundam');
	public readonly avatarUrl: string = getBotAvatar('Gundam');

	handleMessage(message: Message<boolean>): void {
		if (message.author.bot) return;

		if (getBotPattern('Gundam', 'Default')?.test(message.content)) {
			this.sendReply(message.channel as TextChannel, getBotResponse('Gundam', 'Default'));
		}
	}
}
