import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { SheeshBotConfig } from '../config/sheeshBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class SheeshBot extends ReplyBot {
	public get defaultBotName(): string {
		return SheeshBotConfig.Name;
	}

	public get botIdentity(): BotIdentity {
		return {
			botName: this.defaultBotName,
			avatarUrl: SheeshBotConfig.Avatars.Default
		};
	}

	public async handleMessage(message: Message, skipBotMessages = true): Promise<void> {
		// Skip bot messages if skipBotMessages is true
		if (skipBotMessages && this.isBot(message)) {
			return;
		}

		if (SheeshBotConfig.Patterns.Default?.test(message.content)) {
			await this.sendReply(message.channel as TextChannel, SheeshBotConfig.Responses.Default());
		}
	}
}
