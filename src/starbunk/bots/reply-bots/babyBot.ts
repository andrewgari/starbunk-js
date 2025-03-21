import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { BabyBotConfig } from '../config/babyBotConfig';
import ReplyBot from '../replyBot';

// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class BabyBot extends ReplyBot {
	public get defaultBotName(): string {
		return 'BabyBot';
	}

	public get botIdentity(): BotIdentity {
		return {
			botName: BabyBotConfig.Name,
			avatarUrl: BabyBotConfig.Avatars.Default
		};
	}

	public async handleMessage(message: Message): Promise<void> {
		// Skip bot messages
		if (message.author.bot) {
			return;
		}

		if (BabyBotConfig.Patterns.Default?.test(message.content)) {
			this.sendReply(message.channel as TextChannel, BabyBotConfig.Responses.Default);
		}
	}
}
