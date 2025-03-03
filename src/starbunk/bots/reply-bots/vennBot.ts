import { Message, TextChannel } from 'discord.js';
import userID from '../../../discord/userID';
import random from '../../../utils/random';
import ReplyBot from '../replyBot';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from './botConstants';

export default class VennBot extends ReplyBot {
	private _botName: string = getBotName('Venn');
	private _avatarUrl: string = getBotAvatar('Venn');

	// Public getters
	get botName(): string {
		return this._botName;
	}

	get avatarUrl(): string {
		return this._avatarUrl;
	}

	defaultBotName(): string {
		return 'Venn Bot';
	}

	handleMessage(message: Message<boolean>): void {
		if (message.author.bot) return;

		if (
			(message.author.id == userID.Venn && random.percentChance(5)) ||
			getBotPattern('Venn', 'Default')?.test(message.content)
		) {
			this.sendReply(message.channel as TextChannel, getBotResponse('Venn', 'Default'));
		}
	}
}
