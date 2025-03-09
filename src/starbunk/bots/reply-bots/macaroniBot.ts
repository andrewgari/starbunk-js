import { Message } from 'discord.js';
import { logger } from '../../../services/logger';
import ReplyBot from '../replyBot';

export default class MacaroniBot extends ReplyBot {
	public readonly botName = 'Macaroni Bot';
	protected readonly avatarUrl = 'https://imgur.com/Tpo8Ywd.jpg';

	handleMessage(message: Message): void {
		if (message.author.bot) return;

		const content = message.content.toLowerCase();
		if (content.includes('macaroni')) {
			logger.debug(`MacaroniBot responding to message: ${content}`);
			message.reply('🧀 Macaroni and cheese is the best! 🧀');
		}
	}
}
