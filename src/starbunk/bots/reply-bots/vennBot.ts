import userId from '@/discord/userId';
import { DiscordService } from '@/services/discordService';
import { BotIdentity } from '@/starbunk/types/botIdentity';
import Random from '@/utils/random';
import { Message, TextChannel } from 'discord.js';
import { VennBotConfig } from '../config/vennBotConfig';
import ReplyBot from '../replyBot';

// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class VennBot extends ReplyBot {
	public get botIdentity(): BotIdentity {
		const venn = DiscordService.getInstance().getMemberAsBotIdentity(userId.Venn);
		return {
			avatarUrl: venn.avatarUrl,
			botName: venn.botName
		};
	}

	protected async processMessage(message: Message): Promise<void> {
		const isCringe = VennBotConfig.Patterns.Default.test(message.content.toLowerCase());
		const targetUserId = process.env.DEBUG_MODE === 'true' ? userId.Cova : userId.Venn;
		const isTargetUser = message.author.id === targetUserId;
		const shouldReply = isCringe || (isTargetUser && Random.percentChance(5));

		if (shouldReply) {
			await this.sendReply(message.channel as TextChannel, VennBotConfig.Responses.Default());
		}
	}
}
