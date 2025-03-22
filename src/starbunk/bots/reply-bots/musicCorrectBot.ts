import { BotIdentity } from '@/starbunk/types/botIdentity';
import { Message, TextChannel } from 'discord.js';
import { MusicCorrectBotConfig } from '../config/musicCorrectBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class MusicCorrectBot extends ReplyBot {
	public get defaultBotName(): string {
		return 'MusicCorrectBot';
	}

	public get botIdentity(): BotIdentity {
		return {
			botName: MusicCorrectBotConfig.Name,
			avatarUrl: MusicCorrectBotConfig.Avatars.Default
		};
	}

	constructor() {
		super();
		this.skipBotMessages = false;
	}

	// Allow all messages, including bot messages
	protected override shouldSkipMessage(_message: Message): boolean {
		return false;
	}

	protected async processMessage(message: Message): Promise<void> {
		const content = message.content.toLowerCase();
		const hasMusic = MusicCorrectBotConfig.Patterns.Default?.test(content);

		if (hasMusic) {
			await this.sendReply(message.channel as TextChannel, MusicCorrectBotConfig.Responses.Default(message.author.id));
		}
	}
}
