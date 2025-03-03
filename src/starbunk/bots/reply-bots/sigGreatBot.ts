import { Guild, Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse, getCurrentMemberIdentity } from './botConstants';
export default class SigBestBot extends ReplyBot {
	private _botName: string = getBotName('SigGreat');
	private _avatarUrl: string = getBotAvatar('SigGreat');

	// Public getters
	get botName(): string {
		return this._botName;
	}

	get avatarUrl(): string {
		return this._avatarUrl;
	}

	defaultBotName(): string {
		return 'SigGreat Bot';
	}

	async handleMessage(message: Message): Promise<void> {
		if (message.author.bot) return;

		if (getBotPattern('SigBest', 'Default')?.test(message.content)) {
			const identity = await getCurrentMemberIdentity(message.author.id, message.guild as Guild);
			if (!identity) return;
			this._avatarUrl = identity.avatarUrl ?? this._avatarUrl;
			this._botName = identity?.botName ?? this._botName;
			this.sendReply(message.channel as TextChannel, getBotResponse('SigBest', 'Default'));
		}
	}
}
