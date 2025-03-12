import { TextChannel, WebhookClient } from 'discord.js';
import { Logger, WebhookService as WebhookServiceInterface } from '../services/services';
import { MessageInfo } from './types';

// WebhookService is now manually instantiated instead of using the @Service decorator
export class WebhookService implements WebhookServiceInterface {
	public webhookClient: WebhookClient | null = null;
	public logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger;
		const webhookUrl = process.env.WEBHOOK_URL;
		if (webhookUrl) {
			this.webhookClient = new WebhookClient({ url: webhookUrl });
			this.logger.debug('Webhook service initialized with URL');
		} else {
			this.logger.debug('Webhook service initialized without URL');
		}
	}

	async writeMessage(channel: TextChannel, messageInfo: MessageInfo): Promise<void> {
		try {
			const webhooks = await channel.fetchWebhooks();
			let webhook = webhooks.first();

			if (!webhook) {
				webhook = await channel.createWebhook({
					name: 'BotWebhook',
					avatar: messageInfo.avatarURL,
				});
			}

			await webhook.send(messageInfo);
			this.logger.debug(`Message sent to channel ${channel.name}`);
		} catch (error) {
			this.logger.error('Failed to send webhook message', error as Error);
		}
	}

	async sendMessage(messageInfo: MessageInfo): Promise<void> {
		if (!this.webhookClient) {
			this.logger.error('Webhook URL not found in environment variables');
			throw new Error('Webhook URL not found in environment variables');
		}

		try {
			await this.webhookClient.send(messageInfo);
			this.logger.debug('Message sent via webhook');
		} catch (error) {
			this.logger.error('Failed to send message via webhook', error as Error);
			throw error;
		}
	}
}
