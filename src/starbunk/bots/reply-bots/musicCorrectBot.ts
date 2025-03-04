import { Message, TextChannel } from 'discord.js';
import { ILogger } from '../../../services/Logger';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from '../botConstants';
import ReplyBot from '../replyBot';

export default class MusicCorrectBot extends ReplyBot {
	public readonly botName: string = getBotName('MusicCorrect');
	public readonly avatarUrl: string = getBotAvatar('MusicCorrect');

	constructor(logger?: ILogger) {
		super(logger);
	}

	handleMessage(message: Message): void {
		if (message.author.bot) return;

		if (getBotPattern('MusicCorrect', 'Default')?.test(message.content)) {
			this.logger.debug(`🎵 User ${message.author.username} tried using old play command: "${message.content}"`);
			this.sendReply(
				message.channel as TextChannel,
				getBotResponse('MusicCorrect', 'Default', message.author.id)
			);
		}
	}
}
