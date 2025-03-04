import { Message, TextChannel } from 'discord.js';
import { ILogger } from '../../../services/Logger';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from '../botConstants';
import ReplyBot from '../replyBot';

export default class MacaroniBot extends ReplyBot {
	public readonly botName: string = getBotName('Macaroni');
	public readonly avatarUrl: string = getBotAvatar('Macaroni');

	constructor(logger?: ILogger) {
		super(logger);
	}

	handleMessage(message: Message): void {
		if (message.author.bot) return;

		if (getBotPattern('Macaroni', 'Default')?.test(message.content)) {
			this.logger.debug(`🍝 User ${message.author.username} mentioned macaroni: "${message.content}"`);
			this.sendReply(message.channel as TextChannel, getBotResponse('Macaroni', 'Default'));
		}
	}
}
