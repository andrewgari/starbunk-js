import { Message, TextChannel } from 'discord.js';
import userID from '../../../discord/userID';
import { ILogger } from '../../../services/Logger';
import random from '../../../utils/random';
import { MacaroniBotConfig } from '../config/MacaroniBotConfig';
import ReplyBot from '../replyBot';

export default class MacaroniBot extends ReplyBot {

	constructor(logger?: ILogger) {
		super(logger);
	}

	public readonly botName: string = MacaroniBotConfig.Name;
	public readonly avatarUrl: string = MacaroniBotConfig.Avatars.Default;

	defaultBotName(): string {
		return 'MacaroniBot';
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		const vennRandom = random.percentChance(5) && message.author.id === userID.Venn;
		const mentionsBanana = MacaroniBotConfig.Patterns.Macaroni?.test(message.content);

		if (vennRandom || mentionsBanana) {
			this.logger.debug(`🍝 User ${message.author.username} mentioned macaroni: "${message.content}"`);
			this.sendReply(message.channel as TextChannel, MacaroniBotConfig.Responses.Default(message.content));
		}
	}
}
