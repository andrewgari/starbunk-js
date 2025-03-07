import { Message, TextChannel } from 'discord.js';
import { getCurrentMemberIdentity } from '../../../discord/discordGuildMemberHelper';
import userId from '../../../discord/userId';
import random from '../../../utils/random';
import { VennBotConfig } from '../config/vennBotConfig';
import ReplyBot from '../replyBot';

export default class VennBot extends ReplyBot {
	private _botName: string = VennBotConfig.Name;
	private _avatarUrl: string = 'https://i.imgur.com/1234567890.png';

	// Public getters
	get botName(): string {
		return this._botName;
	}

	get avatarUrl(): string {
		return this._avatarUrl;
	}

	defaultBotName(): string {
		return 'VennBot';
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;
		this._avatarUrl = (await getCurrentMemberIdentity(userId.Venn, message.guild!))?.avatarUrl ?? this._avatarUrl;

		const content = message.content.toLowerCase();
		const isCringe = /cringe/i.test(content);
		const isVenn = message.author.id === userId.Venn;
		const shouldReply = (isVenn && random.percentChance(5)) || isCringe;

		if (shouldReply) {
			this.sendReply(message.channel as TextChannel, VennBotConfig.Responses.Default());
		}
	}
}
