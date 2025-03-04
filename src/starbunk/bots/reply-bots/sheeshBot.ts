import { Message, TextChannel } from 'discord.js';
import { ILogger } from '../../../services/Logger';
import { getBotAvatar, getBotName, getBotPattern, getBotResponse } from '../botConstants';
import ReplyBot from '../replyBot';

export default class SheeshBot extends ReplyBot {
	public readonly botName: string = getBotName('Sheesh');
	public readonly avatarUrl: string = getBotAvatar('Sheesh', 'Default');

	constructor(logger?: ILogger) {
		super(logger);
	}

	handleMessage(message: Message): void {
		if (message.author.bot) return;

		if (getBotPattern('Sheesh', 'Default')?.test(message.content)) {
			this.logger.debug(`😤 User ${message.author.username} said sheesh in: "${message.content}"`);
			this.sendReply(message.channel as TextChannel, getBotResponse('Sheesh', 'Default'));
		}
	}
}
