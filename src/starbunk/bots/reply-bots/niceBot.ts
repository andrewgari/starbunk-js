import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { NiceBotConfig } from '../config/niceBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class NiceBot extends ReplyBot {
	public get defaultBotName(): string {
		return 'NiceBot';
	}

	public get botIdentity(): BotIdentity {
		return {
			avatarUrl: NiceBotConfig.Avatars.Default,
			botName: NiceBotConfig.Name
		};
	}

	public async handleMessage(message: Message<boolean>): Promise<void> {
		if (NiceBotConfig.Patterns.Default?.test(message.content)) {
			this.sendReply(message.channel as TextChannel, NiceBotConfig.Responses.Default);
		}
	}
}
