import { TextChannel, WebhookClient } from 'discord.js';
import { MessageInfo } from '../discord/messageInfo';
import { logger } from '../services/logger';
import container from '../services/serviceContainer';
import { serviceRegistry } from '../services/serviceRegistry';

export interface IWebhookService {
	sendMessage(message: MessageInfo): Promise<void>;
	writeMessage(channel: TextChannel, message: MessageInfo): Promise<void>;
}

export class WebhookService implements IWebhookService {
	private webhookClient: WebhookClient | null = null;

	constructor() {
		const webhookUrl = process.env.WEBHOOK_URL;
		if (webhookUrl) {
			this.webhookClient = new WebhookClient({ url: webhookUrl });
			logger.debug('Webhook service initialized with URL');
		} else {
			logger.debug('Webhook service initialized without URL');
		}
	}

	async sendMessage(message: MessageInfo): Promise<void> {
		if (!this.webhookClient) {
			logger.error('Webhook URL not found in environment variables');
			throw new Error('Webhook URL not found in environment variables');
		}

		try {
			await this.webhookClient.send({
				content: message.content,
				username: message.username,
				avatarURL: message.avatarURL,
			});
			logger.debug(`Message sent via webhook: ${message.content.substring(0, 50)}...`);
		} catch (error) {
			logger.error('Failed to send message via webhook', error as Error);
			throw error;
		}
	}

	async writeMessage(channel: TextChannel, message: MessageInfo): Promise<void> {
		try {
			const webhooks = await channel.fetchWebhooks();
			let webhook = webhooks.find(wh => wh.name === 'BotWebhook');

			if (!webhook) {
				webhook = await channel.createWebhook({
					name: 'BotWebhook',
					avatar: message.avatarURL,
				});
			}

			await webhook.send({
				content: message.content,
				username: message.username,
				avatarURL: message.avatarURL,
			});

			logger.debug(`Message sent to channel ${channel.name}: ${message.content.substring(0, 50)}...`);
		} catch (error) {
			logger.error(`Failed to send message to channel ${channel.name}`, error as Error);
			throw error;
		}
	}
}

// Register webhook service if not already registered
if (!container.has(serviceRegistry.WEBHOOK_SERVICE)) {
	container.register(serviceRegistry.WEBHOOK_SERVICE, new WebhookService());
}

export default container.get<IWebhookService>(serviceRegistry.WEBHOOK_SERVICE);
