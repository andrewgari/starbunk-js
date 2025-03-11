import { Message, TextChannel } from 'discord.js';
import { Logger } from '../../../services/logger';
import ReplyBot from '../replyBot';

export default class MusicCorrectBot extends ReplyBot {
	public readonly botName = 'Music Correct Bot';
	protected readonly avatarUrl = 'https://imgur.com/Tpo8Ywd.jpg';
	private readonly logger = new Logger();

	constructor() {
		super();
	}

	async handleMessage(message: Message): Promise<void> {
		const content = message.content.toLowerCase();
		if (content.startsWith('!play') && message.channel instanceof TextChannel) {
			this.logger.debug(`🎵 User ${message.author.username} tried using old play command: "${content}"`);
			await this.sendReply(message.channel, 'Please use /play instead of !play');
		}
	}
}
