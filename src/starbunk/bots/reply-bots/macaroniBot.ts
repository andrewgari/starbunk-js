import { Message, TextChannel } from 'discord.js';
import { Logger } from '../../../services/logger';
import { BaseBot, Service, ServiceId, WebhookService } from '../../../services/services';
import { MacaroniBotConfig } from '../config/macaroniBotConfig';

@Service({
	id: ServiceId.MacaroniBot,
	dependencies: [ServiceId.Logger, ServiceId.WebhookService],
	scope: 'singleton'
})
export default class MacaroniBot implements BaseBot {
	public readonly botName = MacaroniBotConfig.Name;

	constructor(
		private readonly logger: Logger,
		private readonly webhookService: WebhookService
	) { }

	async handleMessage(message: Message): Promise<void> {
		const content = message.content.toLowerCase();

		if (message.author.bot) {
			return;
		}

		if (content.includes('macaroni')) {
			this.logger.debug(`MacaroniBot responding to message: ${content}`);
			await this.webhookService.writeMessage(message.channel as TextChannel, {
				username: MacaroniBotConfig.Name,
				avatarURL: MacaroniBotConfig.Avatars.Default,
				content: '🧀 Macaroni and cheese is the best! 🧀',
				embeds: []
			});
		}
	}
}
