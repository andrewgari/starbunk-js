import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';
import { BotConstants, getBotAvatar, getBotName, getBotResponse } from './botConstants';
export default class BabyBot extends ReplyBot {
	public readonly botName = getBotName('Check');
	public readonly avatarUrl = getBotAvatar('Check', 'Default');

	handleMessage(message: Message<boolean>): void {
		if (message.author.bot) return;

		if (BotConstants.Check.Patterns?.Default?.test(message.content)) {
			this.sendReply(message.channel as TextChannel, getBotResponse('Check', 'Default', message.content));
		}
	}
}
