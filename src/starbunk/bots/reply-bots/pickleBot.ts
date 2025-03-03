import { Message, TextChannel } from 'discord.js';
import userID from '../../../discord/userID';
import Random from '../../../utils/random';
import ReplyBot from '../replyBot';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from './botConstants';

export default class PickleBot extends ReplyBot {
	public readonly botName = getBotName('Gremlin');
	public readonly avatarUrl = getBotAvatar('Gremlin', 'Default');

	handleMessage(message: Message<boolean>): void {
		if (message.author.bot) return;

		if (getBotPattern('Gremlin', 'Default')?.test(message.content) ||
			(message.author.id === userID.Sig && Random.percentChance(15))) {
			this.sendReply(message.channel as TextChannel, getBotResponse('Pickle', 'Default'));
		}
	}
}
