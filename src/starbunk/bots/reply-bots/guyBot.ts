import { Message, TextChannel } from 'discord.js';
import userID from '../../../discord/userID';
import random from '../../../utils/random';
import ReplyBot from '../replyBot';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse, getCurrentMemberIdentity } from './botConstants';

export default class GuyBot extends ReplyBot {
	private _botName: string = getBotName('Guy');
	private _avatarUrl: string = getBotAvatar('Guy');

	// Public getters
	get botName(): string {
		return this._botName;
	}

	get avatarUrl(): string {
		return this._avatarUrl;
	}

	defaultBotName(): string {
		return 'Guy Bot'
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const guyIdentity = await getCurrentMemberIdentity(userID.Guy, message.guild!!);
		if (guyIdentity) {
			this._avatarUrl = guyIdentity.avatarUrl ?? this._avatarUrl;
			this._botName = guyIdentity?.botName ?? this._botName;
			if (
				getBotPattern('Guy', 'Default')?.test(message.content) ||
				(message.author.id === userID.Guy && random.percentChance(5))
			) {
				this.sendReply(message.channel as TextChannel, getBotResponse('Guy', 'Default'));
			}
		}
	}
}
