import { Message, TextChannel } from 'discord.js';
import { Logger } from '../../../services/logger';
import { SheeshBotConfig } from '../config/sheeshBotConfig';
import ReplyBot from '../replyBot';

export default class SheeshBot extends ReplyBot {
	public readonly botName = SheeshBotConfig.Name;
	protected readonly avatarUrl = SheeshBotConfig.Avatars.Default;
	private readonly logger = new Logger();

	constructor() {
		super();
	}

	async handleMessage(message: Message): Promise<void> {
		if (message.author.bot) return;

		const content = message.content;
		const hasSheesh = SheeshBotConfig.Patterns.Default?.test(content);

		if (hasSheesh && message.channel instanceof TextChannel) {
			this.logger.debug(`😤 User ${message.author.username} said sheesh in: "${content}"`);
			await this.sendReply(message.channel, SheeshBotConfig.Responses.Default());
		}
	}
}
