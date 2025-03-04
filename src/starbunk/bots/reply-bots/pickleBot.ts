import { Message, TextChannel } from 'discord.js';
import userID from '../../../discord/userID';
import Random from '../../../utils/random';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from '../botConstants';
import ReplyBot from '../replyBot';

export default class PickleBot extends ReplyBot {
	public readonly botName = getBotName('Pickle');
	public readonly avatarUrl = getBotAvatar('Pickle', 'Default');

	handleMessage(message: Message<boolean>): void {
		if (message.author.bot) return;

		if (getBotPattern('Pickle', 'Default')?.test(message.content) ||
			(message.author.id === userID.Sig && Random.percentChance(15))) {
			this.sendReply(message.channel as TextChannel, getBotResponse('Pickle', 'Default'));
		}
	}
}
