import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import Random from '../../../utils/random';
import { BotBotConfig } from '../config/botBotConfig';
import ReplyBot from '../replyBot';

export default class BotBot extends ReplyBot {
	protected shouldSkipMessage(message: Message): boolean {
		// BotBot only responds to bot messages
		return !message.author.bot;
	}

	public get botIdentity(): BotIdentity {
		return {
			botName: BotBotConfig.Name,
			avatarUrl: BotBotConfig.Avatars.Default
		};
	}

	protected async processMessage(message: Message): Promise<void> {
		// BotBot only responds to bot messages with a 10% chance
		const shouldReply = Random.percentChance(10);

		if (shouldReply) {
			await this.sendReply(message.channel as TextChannel, BotBotConfig.Responses.Default);
		}
	}
}
