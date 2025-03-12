import { Message, TextChannel } from 'discord.js';
import { BotIdentity } from '../botIdentity';
import { NiceBotConfig } from '../config/niceBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class NiceBot extends ReplyBot {
	protected get botIdentity(): BotIdentity {
		return {
			userId: '',
			avatarUrl: NiceBotConfig.Avatars.Default,
			botName: NiceBotConfig.Name
		};
	}

	defaultBotName(): string {
		return 'NiceBot';
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const hasNice = NiceBotConfig.Patterns.Default?.test(content);

		if (hasNice) {
			this.sendReply(message.channel as TextChannel, {
				botIdentity: this.botIdentity,
				content: NiceBotConfig.Responses.Default
			});
		}
	}
}
