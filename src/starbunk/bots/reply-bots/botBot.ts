import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import Random from '../../../utils/random';
import { BotBotConfig } from '../config/botBotConfig';
import ReplyBot from '../replyBot';

export default class BotBot extends ReplyBot {
	protected get defaultBotName(): string {
		return 'BotBot';
	}
	protected get botIdentity(): BotIdentity {
		return {
			botName: BotBotConfig.Name,
			avatarUrl: BotBotConfig.Avatars.Default
		};
	}

	protected async processMessage(message: Message): Promise<void> {
		const isBot = message.author.bot;
		const shouldReply = isBot && Random.percentChance(10);

		if (shouldReply) {
			this.sendReply(message.channel as TextChannel, BotBotConfig.Responses.Default);
		}
	}
}
