import { Message, TextChannel } from 'discord.js';
import { getCurrentMemberIdentity } from '../../../discord/discordGuildMemberHelper';
import userId from '../../../discord/userId';
import random from '../../../utils/random';
import { GuyBotConfig } from '../config/guyBotConfig';
import ReplyBot from '../replyBot';

export default class GuyBot extends ReplyBot {
	protected get botIdentity(): { userId: string; botName: string; avatarUrl: string } {
		return {
			userId: '',
			botName: GuyBotConfig.Name,
			avatarUrl: GuyBotConfig.Avatars.Default
		};
	}

	public async handleMessage(message: Message): Promise<void> {
		if (message.author.bot) return;

		const guyIdentity = await getCurrentMemberIdentity(userId.Guy, message.guild!);
		if (!guyIdentity) return;

		const content = message.content;
		const hasGuy = GuyBotConfig.Patterns.Default?.test(content);
		const targetUserId = process.env.DEBUG_MODE === 'true' ? userId.Cova : userId.Guy;
		const isTargetUser = message.author.id === targetUserId;
		const shouldReply = isTargetUser || (hasGuy && random.percentChance(5));

		if (shouldReply) {
			await this.sendReply(message.channel as TextChannel, {
				botIdentity: {
					userId: '',
					botName: guyIdentity.botName ?? this.botName,
					avatarUrl: guyIdentity.avatarUrl ?? this.avatarUrl
				},
				content: GuyBotConfig.Responses.Default()
			});
		}
	}
}