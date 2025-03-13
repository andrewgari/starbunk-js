import { Logger } from '@/services/logger';
import { Message, TextChannel } from 'discord.js';
import { getCurrentMemberIdentity } from '../../../discord/discordGuildMemberHelper';
import userId from '../../../discord/userId';
import random from '../../../utils/random';
import { GuyBotConfig } from '../config/guyBotConfig';
import ReplyBot from '../replyBot';

export default class GuyBot extends ReplyBot {
	private readonly logger = new Logger();

	protected get botIdentity(): { userId: string; botName: string; avatarUrl: string } {
		return {
			userId: '',
			botName: GuyBotConfig.Name,
			avatarUrl: GuyBotConfig.Avatars.Default
		};
	}

	public async handleMessage(message: Message): Promise<void> {
		if (message.author.bot) return;

		let shouldReply = false;
		let targetUserId = userId.Guy;
		if (process.env.DEBUG_MODE === 'true') {
			shouldReply = true;
			targetUserId = userId.Cova;
		} else {
			const hasGuy = GuyBotConfig.Patterns.Default?.test(message.content);
			const isTargetUser = message.author.id === targetUserId;
			shouldReply = isTargetUser || (hasGuy && random.percentChance(5));
		}

		if (shouldReply) {
			const guyIdentity = await getCurrentMemberIdentity(targetUserId, message.guild!);
			if (!guyIdentity) {
				this.logger.error(`VennBot could not get identity for user ${userId.Venn}`);
				return;
			}
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
