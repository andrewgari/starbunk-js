import { Guild, Message, TextChannel } from 'discord.js';
import { getCurrentMemberIdentity } from '../../../discord/discordGuildMemberHelper';
import { SigGreatBotConfig } from '../config/sigGreatBotConfig';
import ReplyBot from '../replyBot';

export default class SigGreatBot extends ReplyBot {
	private _botName = SigGreatBotConfig.Name;
	private _avatarUrl = SigGreatBotConfig.Avatars.Default;

	// Public getters
	public get botName(): string {
		return this._botName;
	}

	protected get avatarUrl(): string {
		return this._avatarUrl;
	}

	defaultBotName(): string {
		return 'SigGreatBot';
	}

	public async handleMessage(message: Message): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const hasSigGreat = SigGreatBotConfig.Patterns.Default?.test(content);

		if (hasSigGreat) {
			const identity = await getCurrentMemberIdentity(message.author.id, message.guild as Guild);
			if (identity) {
				this._avatarUrl = identity.avatarUrl ?? this._avatarUrl;
				this._botName = identity.botName ?? this._botName;
			}

			await this.sendReply(message.channel as TextChannel, SigGreatBotConfig.Responses.Default);
		}
	}
}
