import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { GundamBotConfig } from '../config/gundamBotConfig';
import ReplyBot from '../replyBot';

// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class GundamBot extends ReplyBot {
	protected get defaultBotName(): string {
		return 'GundamBot';
	}

	protected get botIdentity(): BotIdentity {
		return {
			botName: GundamBotConfig.Name,
			avatarUrl: GundamBotConfig.Avatars.Default
		};
	}

	protected async processMessage(message: Message): Promise<void> {
		if (GundamBotConfig.Patterns.Default?.test(message.content)) {
			this.sendReply(message.channel as TextChannel, GundamBotConfig.Responses.Default);
		}
	}
}
