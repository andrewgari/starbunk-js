import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';
import { BotConstants, getBotAvatar, getBotName, getBotResponse } from './botConstants';

export default class ChaosBot extends ReplyBot {
	public readonly botName = getBotName('Chaos');
	public readonly avatarUrl = getBotAvatar('Chaos', 'Default');

	handleMessage(message: Message<boolean>): void {
		if (message.author.bot) return;

		if (BotConstants.Chaos.Patterns?.Default?.test(message.content)) {
			this.sendReply(message.channel as TextChannel, getBotResponse('Chaos', 'Default'));
		}
	}
}
