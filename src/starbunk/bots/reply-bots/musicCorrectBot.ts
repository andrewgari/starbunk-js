import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { MusicCorrectBotConfig } from '../config/musicCorrectBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class MusicCorrectBot extends ReplyBot {
	protected get defaultBotName(): string {
		return 'MusicCorrectBot';
	}

	protected get botIdentity(): BotIdentity {
		return {
			avatarUrl: MusicCorrectBotConfig.Avatars.Default,
			botName: MusicCorrectBotConfig.Name
		};
	}

	async processMessage(message: Message): Promise<void> {
		const content = message.content.toLowerCase();
		if (content.startsWith('!play')) {
			await this.sendReply(message.channel as TextChannel, MusicCorrectBotConfig.Responses.Default(message.author.id));
		}
	}
}
