import { Message, TextChannel } from 'discord.js';
import { Logger } from '../../../services/Logger';
import ReplyBot from '../replyBot';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from './botConstants';

export default class SheeshBot extends ReplyBot {
	public readonly botName: string = getBotName('Sheesh');
	public readonly avatarUrl: string = getBotAvatar('Sheesh', 'Default');

	handleMessage(message: Message): void {
		if (message.author.bot) return;

		if (getBotPattern('Sheesh', 'Default')?.test(message.content)) {
			Logger.debug(`😤 User ${message.author.username} said sheesh in: "${message.content}"`);
			this.sendReply(message.channel as TextChannel, getBotResponse('Sheesh', 'Default'));
		}
	}
}
