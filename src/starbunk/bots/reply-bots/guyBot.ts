import { Message, TextChannel } from 'discord.js';
import { getCurrentMemberIdentity } from '../../../discord/discordGuildMemberHelper';
import userId from '../../../discord/userId';
import random from '../../../utils/random';
import { GuyBotConfig } from '../config/guyBotConfig';
import ReplyBot from '../replyBot';

export default class GuyBot extends ReplyBot {
	private _botName = GuyBotConfig.Name;
	private _avatarUrl = GuyBotConfig.Avatars.Default;

	public get botName(): string {
		return this._botName;
	}

	protected get avatarUrl(): string {
		return this._avatarUrl;
	}

	public async handleMessage(message: Message): Promise<void> {
		if (message.author.bot) return;

		const guyIdentity = await getCurrentMemberIdentity(userId.Guy, message.guild!);
		if (!guyIdentity) return;

		this._avatarUrl = guyIdentity.avatarUrl ?? this._avatarUrl;
		this._botName = guyIdentity?.botName ?? this._botName;

		const content = message.content;
		const hasGuy = GuyBotConfig.Patterns.Default?.test(content);
		const targetUserId = process.env.DEBUG_MODE === 'true' ? userId.Cova : userId.Guy;
		const isTargetUser = message.author.id === targetUserId;
		const shouldReply = hasGuy || (isTargetUser && random.percentChance(5));

		if (shouldReply) {
			await this.sendReply(message.channel as TextChannel, GuyBotConfig.Responses.Default());
		}
	}
}
