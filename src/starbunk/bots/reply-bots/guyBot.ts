import { Message, TextChannel } from 'discord.js';
import userID from '../../../discord/userID';
import random from '../../../utils/random';
import { getCurrentMemberIdentity } from '../botConstants';
import { GuyBotConfig } from '../config/GuyBotConfig';
import ReplyBot from '../replyBot';

export default class GuyBot extends ReplyBot {
	private _botName: string = GuyBotConfig.Name;
	private _avatarUrl: string = GuyBotConfig.Avatars.Default;

	// Public getters
	get botName(): string {
		return this._botName;
	}

	get avatarUrl(): string {
		return this._avatarUrl;
	}

	defaultBotName(): string {
		return 'GuyBot';
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const guyIdentity = await getCurrentMemberIdentity(userID.Guy, message.guild!);
		if (!guyIdentity) return;

		this._avatarUrl = guyIdentity.avatarUrl ?? this._avatarUrl;
		this._botName = guyIdentity?.botName ?? this._botName;

		const content = message.content;
		const hasGuy = GuyBotConfig.Patterns.Default?.test(content);
		const isGuy = message.author.id === userID.Guy;
		const shouldReply = hasGuy || (isGuy && random.percentChance(5));

		if (shouldReply) {
			this.sendReply(message.channel as TextChannel, GuyBotConfig.Responses.Default());
		}
	}
}
