import { Message, TextChannel } from 'discord.js';
import { ILogger } from '../../services/logger';
import loggerFactory from '../../services/loggerFactory';
import container from '../../services/serviceContainer';
import { ServiceRegistry } from '../../services/serviceRegistry';
import { IWebhookService } from '../../webhooks/webhookService';

export default abstract class ReplyBot {
	protected logger: ILogger;
	protected webhookService: IWebhookService;

	constructor(logger?: ILogger, webhookService?: IWebhookService) {
		this.logger = logger || loggerFactory.getLogger();
		
		// Get webhook service from container
		const containerWebhookService = container.get<IWebhookService>(ServiceRegistry.WEBHOOK_SERVICE);
		
		// Use provided service or container service
		if (webhookService) {
			this.webhookService = webhookService;
		} else if (containerWebhookService) {
			this.webhookService = containerWebhookService;
		} else {
			throw new Error('WebhookService not found in container. Make sure it is registered before creating bots.');
		}
	}

	abstract botName: string;
	defaultBotName(): string {
		return this.botName;
	}
	abstract avatarUrl: string;
	abstract handleMessage(message: Message): void;
	sendReply(channel: TextChannel, response: string): void {
		try {
			this.webhookService.writeMessage(channel, {
				username: this.botName,
				avatarURL: this.avatarUrl,
				content: response,
				embeds: [],
			});
		} catch (error) {
			this.logger.error(`Failed to send reply to channel ${channel.id}: ${error}`);
		}
	}
	isSelf(message: Message): boolean {
		return message.author.bot && message.author.id === message.client.user?.id;
	}
}
