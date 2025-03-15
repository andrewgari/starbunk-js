import { Logger } from '@/services/logger';
import { Message, TextChannel } from 'discord.js';
import { getCurrentMemberIdentity } from '../../../discord/discordGuildMemberHelper';
import userId from '../../../discord/userId';
import random from '../../../utils/random';
import { BotIdentity } from '../botIdentity';
import { GuyBotConfig } from '../config/guyBotConfig';
import ReplyBot from '../replyBot';

export default class GuyBot extends ReplyBot {
	private readonly logger = new Logger();

	protected get botIdentity(): BotIdentity {
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
		const isAboutGuy = GuyBotConfig.Patterns.Default?.test(message.content);

		if (process.env.DEBUG_MODE === 'true') {
			shouldReply = true;
			targetUserId = userId.Cova;
		} else {
			const isTargetUser = message.author.id === targetUserId;
			shouldReply = (isTargetUser && random.percentChance(5)) || isAboutGuy;
		}

		if (shouldReply) {
			const targetIdentity = await getCurrentMemberIdentity(targetUserId, message.guild!);
			if (!targetIdentity) {
				this.logger.error(`GuyBot could not get identity for user ${targetUserId}`);
				return;
			}
			await this.sendReply(message.channel as TextChannel, {
				botIdentity: targetIdentity,
				content: GuyBotConfig.Responses.Default()
			});
		}
	}
}
