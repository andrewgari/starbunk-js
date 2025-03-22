import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { BabyBotConfig } from '../config/babyBotConfig';
import ReplyBot from '../replyBot';

// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class BabyBot extends ReplyBot {
	public get botIdentity(): BotIdentity {
		return {
			botName: BabyBotConfig.Name,
			avatarUrl: BabyBotConfig.Avatars.Default
		};
	}

	protected async processMessage(message: Message): Promise<void> {
		const content = message.content.toLowerCase();
		const hasBaby = BabyBotConfig.Patterns.Default?.test(content);

		if (hasBaby) {
			await this.sendReply(message.channel as TextChannel, BabyBotConfig.Responses.Default);
		}
	}
}
