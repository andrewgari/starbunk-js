import { Message, TextChannel } from 'discord.js';
import { ILogger } from '../../../services/Logger';
import { SheeshBotConfig } from '../config/SheeshBotConfig';
import ReplyBot from '../replyBot';

export default class SheeshBot extends ReplyBot {
	public readonly botName: string = SheeshBotConfig.Name;
	public readonly avatarUrl: string = SheeshBotConfig.Avatars.Default;

	constructor(logger?: ILogger) {
		super(logger);
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const hasSheesh = SheeshBotConfig.Patterns.Default?.test(content);

		if (hasSheesh) {
			this.logger.debug(`😤 User ${message.author.username} said sheesh in: "${content}"`);
			this.sendReply(message.channel as TextChannel, SheeshBotConfig.Responses.Default());
		}
	}
}
