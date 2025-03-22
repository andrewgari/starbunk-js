import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { NiceBotConfig } from '../config/niceBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class NiceBot extends ReplyBot {
	public get botIdentity(): BotIdentity {
		return {
			botName: NiceBotConfig.Name,
			avatarUrl: NiceBotConfig.Avatars.Default
		};
	}

	protected async processMessage(message: Message): Promise<void> {
		const content = message.content.toLowerCase();
		const hasNice = NiceBotConfig.Patterns.Default?.test(content);

		if (hasNice) {
			await this.sendReply(message.channel as TextChannel, NiceBotConfig.Responses.Default);
		}
	}
}
