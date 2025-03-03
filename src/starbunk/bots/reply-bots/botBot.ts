import { Message, TextChannel } from 'discord.js';
import Random from '../../../utils/random';
import ReplyBot from '../replyBot';
import { getBotAvatar, getBotName, getBotResponse } from './botConstants';
export default class BotBot extends ReplyBot {
	public readonly botName = getBotName('Bot');
	public readonly avatarUrl = getBotAvatar('Bot', 'Default');

	handleMessage(message: Message<boolean>): void {
		if (this.isSelf(message)) return;

		if (message.author.bot && Random.percentChance(10)) {
			this.sendReply(message.channel as TextChannel, getBotResponse('Bot', 'Default'));
		}
	}
}
