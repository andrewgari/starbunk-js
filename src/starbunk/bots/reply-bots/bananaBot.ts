import { Message, TextChannel } from 'discord.js';
import UserID from '../../../discord/userID';
import random from '../../../utils/random';
import ReplyBot from '../replyBot';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from '../botConstants';

export default class BananaBot extends ReplyBot {
	private _botName = getBotName('Banana') ?? 'Banana Bot';
	private _avatarUrl = getBotAvatar('Banana', 'Default');

	// Public getters
	get botName(): string {
		return this._botName;
	}

	get avatarUrl(): string {
		return this._avatarUrl;
	}

	defaultBotName(): string {
		return "Banana Bot";
	}

	handleMessage(message: Message<boolean>): void {
		if (message.author.bot) return;

		if (getBotPattern('Banana', 'Default')?.test(message.content) ||
			(message.author.id === UserID.Venn && random.percentChance(5))) {
			this.sendReply(message.channel as TextChannel, getBotResponse('Banana', 'Default'));
		}
	}
}
