import { Message, TextChannel } from 'discord.js';
import { Logger } from '../../../services/Logger';
import ReplyBot from '../replyBot';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from './botConstants';

export default class MacaroniBot extends ReplyBot {
	public readonly botName: string = getBotName('Macaroni');
	public readonly avatarUrl: string = getBotAvatar('Macaroni');

	handleMessage(message: Message): void {
		if (message.author.bot) return;

		if (getBotPattern('Macaroni', 'Default')?.test(message.content)) {
			Logger.debug(`🍝 User ${message.author.username} mentioned macaroni: "${message.content}"`);
			this.sendReply(message.channel as TextChannel, getBotResponse('Macaroni', 'Default'));
		}
	}
}
