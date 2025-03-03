import { Message, TextChannel } from 'discord.js';
import { Logger } from '../../../services/Logger';
import ReplyBot from '../replyBot';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from './botConstants';

export default class MusicCorrectBot extends ReplyBot {
	public readonly botName: string = getBotName('MusicCorrect');
	public readonly avatarUrl: string = getBotAvatar('MusicCorrect');

	handleMessage(message: Message): void {
		if (message.author.bot) return;

		if (getBotPattern('MusicCorrect', 'Default')?.test(message.content)) {
			Logger.debug(`🎵 User ${message.author.username} tried using old play command: "${message.content}"`);
			this.sendReply(
				message.channel as TextChannel,
				getBotResponse('MusicCorrect', 'Default', message.author.id)
			);
		}
	}
}
