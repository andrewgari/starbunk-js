import { Message, TextChannel } from 'discord.js';
import { getCurrentMemberIdentity } from '../../../discord/discordGuildMemberHelper';
import userId from '../../../discord/userId';
import { Logger } from '../../../services/logger';
import random from '../../../utils/random';
import { BotIdentity } from '../botIdentity';
import { VennBotConfig } from '../config/vennBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class VennBot extends ReplyBot {
	private readonly logger = new Logger();

	protected get botIdentity(): BotIdentity {
		return {
			userId: '',
			avatarUrl: VennBotConfig.Avatars.Default,
			botName: VennBotConfig.Name
		};
	}

	public async handleMessage(message: Message): Promise<void> {
		if (message.author.bot) return;

		let shouldReply = false;
		let targetUserId = userId.Venn;
		const isCringe = VennBotConfig.Patterns.Default.test(message.content.toLowerCase());

		if (process.env.DEBUG_MODE === 'true') {
			shouldReply = true;
			targetUserId = userId.Cova;
		} else {
			const isTargetUser = message.author.id === targetUserId;
			shouldReply = (isTargetUser && random.percentChance(5)) || isCringe;
		}

		if (shouldReply) {
			const targetIdentity = await getCurrentMemberIdentity(userId.Venn, message.guild!);
			if (!targetIdentity) {
				this.logger.error(`VennBot could not get identity for user ${userId.Venn}`);
				return;
			}

			await this.sendReply(message.channel as TextChannel, {
				botIdentity: targetIdentity,
				content: VennBotConfig.Responses.Default()
			});
		}
	}
}
