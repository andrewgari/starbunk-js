;
import { Message, TextChannel } from 'discord.js';
import { Logger } from '../../../services/logger';
import { BotIdentity } from '../botIdentity';
import { MusicCorrectBotConfig } from '../config/musicCorrectBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class MusicCorrectBot extends ReplyBot {
	protected get botIdentity(): BotIdentity {
		return {
			userId: '',
			avatarUrl: MusicCorrectBotConfig.Avatars.Default,
			botName: MusicCorrectBotConfig.Name
		};
	}
	private readonly logger = new Logger();

	constructor() {
		super();
	}

	async handleMessage(message: Message): Promise<void> {
		const content = message.content.toLowerCase();
		if (content.startsWith('!play') && message.channel instanceof TextChannel) {
			this.logger.debug(`🎵 User ${message.author.username} tried using old play command: "${content}"`);
			await this.sendReply(message.channel, {
				botIdentity: this.botIdentity,
				content: MusicCorrectBotConfig.Responses.Default(message.author.id)
			});
		}
	}
}
