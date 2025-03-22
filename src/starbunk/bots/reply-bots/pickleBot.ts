import userId from '@/discord/userId';
import { BotIdentity } from '@/starbunk/types/botIdentity';
import Random from '@/utils/random';
import { Message, TextChannel } from 'discord.js';
import { PickleBotConfig } from '../config/pickleBotConfig';
import ReplyBot from '../replyBot';

export default class PickleBot extends ReplyBot {
	public get defaultBotName(): string {
		return 'PickleBot';
	}

	public get botIdentity(): BotIdentity {
		return {
			botName: PickleBotConfig.Name,
			avatarUrl: PickleBotConfig.Avatars.Default
		};
	}

	protected async processMessage(message: Message): Promise<void> {
		const mentionsGremlin = PickleBotConfig.Patterns.Default?.test(message.content);
		const targetUserId = process.env.DEBUG_MODE === 'true' ? userId.Cova : userId.Sig;
		const isTargetUser = message.author.id === targetUserId;
		const shouldReply = mentionsGremlin || (isTargetUser && Random.percentChance(15));

		if (shouldReply) {
			await this.sendReply(message.channel as TextChannel, PickleBotConfig.Responses.Default);
		}
	}
}
