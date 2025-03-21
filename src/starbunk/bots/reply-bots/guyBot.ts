import { DiscordService } from '@/services/discordService';
import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import userId from '../../../discord/userId';
import random from '../../../utils/random';
import { GuyBotConfig } from '../config/guyBotConfig';
import ReplyBot from '../replyBot';

export default class GuyBot extends ReplyBot {
	public get defaultBotName(): string {
		return 'GuyBot';
	}

	public get botIdentity(): BotIdentity {
		return DiscordService.getInstance().getMemberAsBotIdentity(userId.Guy);
	}

	public async handleMessage(message: Message): Promise<void> {
		const targetUserId = process.env.DEBUG_MODE === 'true' ? userId.Cova : userId.Guy;
		const isTargetUser = message.author.id === targetUserId;
		const guyMentioned = GuyBotConfig.Patterns.Default?.test(message.content);
		const guyReplied = isTargetUser && random.percentChance(5);
		const shouldReply = guyMentioned || guyReplied;

		if (shouldReply) {
			await this.sendReply(message.channel as TextChannel, GuyBotConfig.Responses.Default());
		}
	}
}
