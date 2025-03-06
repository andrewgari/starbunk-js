import { Guild, Message, TextChannel } from 'discord.js';
import { getCurrentMemberIdentity } from '../botConstants';
import { SigGreatBotConfig } from '../config/SigGreatBotConfig';
import ReplyBot from '../replyBot';

export default class SigGreatBot extends ReplyBot {
	private _botName: string = SigGreatBotConfig.Name;
	private _avatarUrl: string = SigGreatBotConfig.Avatars.Default;

	// Public getters
	get botName(): string {
		return this._botName;
	}

	get avatarUrl(): string {
		return this._avatarUrl;
	}

	defaultBotName(): string {
		return 'SigGreatBot';
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const hasSigGreat = SigGreatBotConfig.Patterns.Default?.test(content);

		if (hasSigGreat) {
			const identity = await getCurrentMemberIdentity(message.author.id, message.guild as Guild) ?? {
				avatarUrl: this._avatarUrl,
				botName: this._botName
			};

			this._avatarUrl = identity.avatarUrl ?? this._avatarUrl;
			this._botName = identity?.botName ?? this._botName;

			this.sendReply(message.channel as TextChannel, SigGreatBotConfig.Responses.Default);
		}
	}
}
