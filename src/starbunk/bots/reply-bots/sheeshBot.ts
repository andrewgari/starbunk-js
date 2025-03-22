import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { SheeshBotConfig } from '../config/sheeshBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class SheeshBot extends ReplyBot {
	public get botIdentity(): BotIdentity {
		return {
			botName: SheeshBotConfig.Name,
			avatarUrl: SheeshBotConfig.Avatars.Default
		};
	}

	protected async processMessage(message: Message): Promise<void> {
		const content = message.content.toLowerCase();
		const hasSheesh = SheeshBotConfig.Patterns.Default?.test(content);

		if (hasSheesh) {
			await this.sendReply(message.channel as TextChannel, SheeshBotConfig.Responses.Default());
		}
	}
}
