import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import Random from '../../../utils/random';
import { BotBotConfig } from '../config/botBotConfig';
import ReplyBot from '../replyBot';

export default class BotBot extends ReplyBot {
	public get defaultBotName(): string {
		return 'BotBot';
	}
	public get botIdentity(): BotIdentity {
		return {
			botName: BotBotConfig.Name,
			avatarUrl: BotBotConfig.Avatars.Default
		};
	}

	public async handleMessage(message: Message, skipBotMessages = false): Promise<void> {
		// BotBot specifically responds to bot messages, so we set skipBotMessages to false by default
		if (skipBotMessages && this.isBot(message)) {
			return;
		}

		const isBot = message.author.bot;
		const shouldReply = isBot && Random.percentChance(10);

		if (shouldReply) {
			await this.sendReply(message.channel as TextChannel, BotBotConfig.Responses.Default);
		}
	}
}
