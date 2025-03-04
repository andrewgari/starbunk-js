import { Message, TextChannel } from 'discord.js';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from '../botConstants';
import ReplyBot from '../replyBot';

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
