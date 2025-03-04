import { Message, TextChannel } from 'discord.js';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from '../botConstants';
import ReplyBot from '../replyBot';

export default class ChaosBot extends ReplyBot {
	public readonly botName = getBotName('Chaos');
	public readonly avatarUrl = getBotAvatar('Chaos', 'Default');

	handleMessage(message: Message<boolean>): void {
		if (message.author.bot) return;

		if (getBotPattern('Chaos', 'Default')?.test(message.content)) {
			this.sendReply(message.channel as TextChannel, getBotResponse('Chaos', 'Default'));
		}
	}
}
