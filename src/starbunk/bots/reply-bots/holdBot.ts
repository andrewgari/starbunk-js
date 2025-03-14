import { Message, TextChannel } from 'discord.js';
import { BotIdentity } from '../botIdentity';
import { HoldBotConfig } from '../config/holdBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class HoldBot extends ReplyBot {
	protected get botIdentity(): BotIdentity {
		return {
			userId: '',
			avatarUrl: HoldBotConfig.Avatars.Default,
			botName: HoldBotConfig.Name
		};
	}

	defaultBotName(): string {
		return 'HoldBot';
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const hasHold = HoldBotConfig.Patterns.Default?.test(content);

		if (hasHold) {
			this.sendReply(message.channel as TextChannel, {
				content: HoldBotConfig.Responses.Default
			});
		}
	}
}
