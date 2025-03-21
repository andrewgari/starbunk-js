import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { HoldBotConfig } from '../config/holdBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class HoldBot extends ReplyBot {
	protected get defaultBotName(): string {
		return 'HoldBot';
	}

	protected get botIdentity(): BotIdentity {
		return {
			avatarUrl: HoldBotConfig.Avatars.Default,
			botName: HoldBotConfig.Name
		};
	}

	async processMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const hasHold = HoldBotConfig.Patterns.Default?.test(content);

		if (hasHold) {
			this.sendReply(message.channel as TextChannel, HoldBotConfig.Responses.Default);
		}
	}
}
