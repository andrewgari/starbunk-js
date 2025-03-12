;
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
	constructor(private readonly logger: Logger) {
		super();
	}

	protected get botIdentity(): BotIdentity {
		return {
			userId: '',
			avatarUrl: VennBotConfig.Avatars.Default,
			botName: VennBotConfig.Name
		};
	}

	public async handleMessage(message: Message): Promise<void> {
		if (message.author.bot) return;

		const vennIdentity = await getCurrentMemberIdentity(userId.Venn, message.guild!);
		if (!vennIdentity) {
			this.logger.error(`VennBot could not get identity for user ${userId.Venn}`);
			return;
		}

		const content = message.content.toLowerCase();
		const isCringe = /cringe/i.test(content);
		const targetUserId = process.env.DEBUG_MODE === 'true' ? userId.Cova : userId.Venn;
		const isTargetUser = message.author.id === targetUserId;
		const shouldReply = (isTargetUser && random.percentChance(5)) || isCringe;

		if (shouldReply) {
			await this.sendReply(message.channel as TextChannel, {
				botIdentity: vennIdentity,
				content: VennBotConfig.Responses.Default()
			});
		}
	}
}
