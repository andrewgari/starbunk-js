import { Message, TextChannel } from 'discord.js';
import { Logger } from '../../../services/logger';
import { WebhookService   } from '../../../services/services';
import { BotIdentity } from '../botIdentity';
import { MacaroniBotConfig } from '../config/macaroniBotConfig';
import ReplyBot from '../replyBot';


// This class is registered by StarbunkClient.registerBots() rather than through the service container
export default class MacaroniBot extends ReplyBot {
	protected get botIdentity(): BotIdentity {
		return {
			userId: '',
			avatarUrl: MacaroniBotConfig.Avatars.Default,
			botName: MacaroniBotConfig.Name
		};
	}

	constructor(
		private readonly logger: Logger,
		// webhookService is injected but not directly used by this class
		_webhookService: WebhookService
	) {
		super();
	}

	async handleMessage(message: Message): Promise<void> {
		const content = message.content.toLowerCase();

		if (message.author.bot) {
			return;
		}

		if (content.includes('macaroni')) {
			this.logger.debug(`MacaroniBot responding to message: ${content}`);
			await this.sendReply(message.channel as TextChannel, {
				botIdentity: this.botIdentity,
				content: MacaroniBotConfig.Responses.Default(content)
			});
		}
	}
}
