import { DiscordService } from '@/services/discordService';
import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import userId from '../../../discord/userId';
import random from '../../../utils/random';
import { VennBotConfig } from '../config/vennBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class VennBot extends ReplyBot {
	protected get defaultBotName(): string {
		return 'VennBot';
	}

	protected get botIdentity(): BotIdentity {
		const venn = DiscordService.getInstance().getMemberAsBotIdentity(userId.Venn);
		return {
			avatarUrl: venn.avatarUrl,
			botName: venn.botName
		};
	}

	public async processMessage(message: Message): Promise<void> {
		const isCringe = VennBotConfig.Patterns.Default.test(message.content.toLowerCase());
		const targetUserId = process.env.DEBUG_MODE === 'true' ? userId.Cova : userId.Venn;
		const isTargetUser = message.author.id === targetUserId;
		const shouldReply = isCringe || (isTargetUser && random.percentChance(5));

		if (shouldReply) {
			this.sendReply(message.channel as TextChannel, VennBotConfig.Responses.Default());
		}
	}
}
