import { Message, TextChannel } from 'discord.js';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from '../botConstants';
import ReplyBot from '../replyBot';

export default class EzioBot extends ReplyBot {
	public readonly botName = getBotName('Ezio');
	public readonly avatarUrl = getBotAvatar('Ezio');

	handleMessage(message: Message<boolean>): void {
		if (message.author.bot) return;

		if (getBotPattern('Ezio', 'Default')?.test(message.content)) {
			this.sendReply(
				message.channel as TextChannel,
				getBotResponse('Ezio', 'Default', message.author.displayName)
			);
		}
	}
}
