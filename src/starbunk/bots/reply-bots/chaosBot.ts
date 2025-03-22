import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { ChaosBotConfig } from '../config/chaosBotConfig';
import ReplyBot from '../replyBot';

// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class ChaosBot extends ReplyBot {
	public get botIdentity(): BotIdentity {
		return {
			botName: ChaosBotConfig.Name,
			avatarUrl: ChaosBotConfig.Avatars.Default
		};
	}

	protected async processMessage(message: Message): Promise<void> {
		const content = message.content.toLowerCase();
		const hasChaos = ChaosBotConfig.Patterns.Default?.test(content);

		if (hasChaos) {
			await this.sendReply(message.channel as TextChannel, ChaosBotConfig.Responses.Default);
		}
	}
}
