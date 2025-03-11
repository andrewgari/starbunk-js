import { Message, TextChannel } from 'discord.js';
import { getCurrentMemberIdentity } from '../../../discord/discordGuildMemberHelper';
import userId from '../../../discord/userId';
import random from '../../../utils/random';
import { VennBotConfig } from '../config/vennBotConfig';
import ReplyBot from '../replyBot';

export default class VennBot extends ReplyBot {
	private _botName = VennBotConfig.Name;
	private _avatarUrl = VennBotConfig.Avatars.Default;

	public get botName(): string {
		return this._botName;
	}

	protected get avatarUrl(): string {
		return this._avatarUrl;
	}

	public async handleMessage(message: Message): Promise<void> {
		if (message.author.bot) return;

		const vennIdentity = await getCurrentMemberIdentity(userId.Venn, message.guild!);
		if (vennIdentity?.avatarUrl) {
			this._avatarUrl = vennIdentity.avatarUrl;
		}

		const content = message.content.toLowerCase();
		const isCringe = /cringe/i.test(content);
		const targetUserId = process.env.DEBUG_MODE === 'true' ? userId.Cova : userId.Venn;
		const isTargetUser = message.author.id === targetUserId;
		const shouldReply = (isTargetUser && random.percentChance(5)) || isCringe;

		if (shouldReply) {
			await this.sendReply(message.channel as TextChannel, VennBotConfig.Responses.Default());
		}
	}
}
