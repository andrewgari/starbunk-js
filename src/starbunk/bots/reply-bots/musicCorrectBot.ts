import { Message, TextChannel } from 'discord.js';
import { ILogger } from '../../../services/logger';
import { MusicCorrectBotConfig } from '../config/musicCorrectBotConfig';
import ReplyBot from '../replyBot';

export default class MusicCorrectBot extends ReplyBot {
	constructor(logger?: ILogger) {
		super(logger);
	}

	public readonly botName: string = MusicCorrectBotConfig.Name;
	public readonly avatarUrl: string = MusicCorrectBotConfig.Avatars.Default;

	defaultBotName(): string {
		return 'MusicCorrectBot';
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const hasOldPlayCommand = MusicCorrectBotConfig.Patterns.Default?.test(content);

		if (hasOldPlayCommand) {
			this.logger.debug(`🎵 User ${message.author.username} tried using old play command: "${content}"`);
			this.sendReply(
				message.channel as TextChannel,
				MusicCorrectBotConfig.Responses.Default(message.author.id)
			);
		}
	}
}
