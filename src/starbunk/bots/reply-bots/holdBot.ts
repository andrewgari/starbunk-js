import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { HoldBotConfig } from '../config/holdBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class HoldBot extends ReplyBot {
	public get defaultBotName(): string {
		return 'HoldBot';
	}

	public get botIdentity(): BotIdentity {
		return {
			botName: HoldBotConfig.Name,
			avatarUrl: HoldBotConfig.Avatars.Default
		};
	}

	protected async processMessage(message: Message): Promise<void> {
		const content = message.content.toLowerCase();
		const hasHold = HoldBotConfig.Patterns.Default?.test(content);

		if (hasHold) {
			await this.sendReply(message.channel as TextChannel, HoldBotConfig.Responses.Default);
		}
	}
}
