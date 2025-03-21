import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { EzioBotConfig } from '../config/ezioBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class EzioBot extends ReplyBot {
	protected get defaultBotName(): string {
		return 'EzioBot';
	}

	protected get botIdentity(): BotIdentity {
		return {
			botName: EzioBotConfig.Name,
			avatarUrl: EzioBotConfig.Avatars.Default
		};
	}

	protected async processMessage(message: Message): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const hasEzio = EzioBotConfig.Patterns.Default?.test(content);

		if (hasEzio) {
			this.sendReply(
				message.channel as TextChannel,
				EzioBotConfig.Responses.Default(message.author.displayName)
			);
		}
	}
}
