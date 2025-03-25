import { TextChannel, WebhookClient } from 'discord.js';
import environment from '../environment';
import { Logger, WebhookService as WebhookServiceInterface } from '../services/container';
import { MessageInfo } from './types';

// WebhookService is now manually instantiated instead of using the @Service decorator
export class WebhookService implements WebhookServiceInterface {
	public webhookClient: WebhookClient | null = null;
	public logger: Logger;
	private _webhookAvailable: boolean = false;
	private _hasLoggedWebhookWarning: boolean = false;

	constructor(logger: Logger) {
		this.logger = logger;
		const webhookUrl = environment.discord.WEBHOOK_URL;
		if (webhookUrl) {
			try {
				this.webhookClient = new WebhookClient({ url: webhookUrl });
				this._webhookAvailable = true;
				this.logger.debug('Webhook service initialized with URL');
			} catch (error) {
				this.logger.warn('Invalid webhook URL provided');
				this._webhookAvailable = false;
			}
		} else {
			this.logger.warn('Webhook service initialized without URL - will use channel.send fallback');
			this._webhookAvailable = false;
		}
	}

	async writeMessage(channel: TextChannel, messageInfo: MessageInfo): Promise<void> {
		try {
			// Transform botName/avatarUrl to username/avatarURL if needed
			const transformedInfo: MessageInfo = {
				...messageInfo,
				username: messageInfo.username || messageInfo.botName,
				avatarURL: messageInfo.avatarURL || messageInfo.avatarUrl
			};
			delete transformedInfo.botName;
			delete transformedInfo.avatarUrl;

			// Try to use webhooks
			const webhooks = await channel.fetchWebhooks();
			let webhook = webhooks.first();

			if (!webhook) {
				try {
					webhook = await channel.createWebhook({
						name: 'BotWebhook',
						avatar: transformedInfo.avatarURL,
					});
				} catch (webhookCreationError) {
					// If creating webhook fails, fall back to regular message
					this.logger.warn('Failed to create webhook, falling back to regular message');
					await this.fallbackToRegularMessage(channel, transformedInfo);
					return;
				}
			}

			await webhook.send(transformedInfo);
			this.logger.debug(`Message sent to channel ${channel.name} via webhook`);
		} catch (error) {
			this.logger.warn('Failed to send webhook message, falling back to regular message');
			await this.fallbackToRegularMessage(channel, messageInfo);
		}
	}

	async sendMessage(messageInfo: MessageInfo): Promise<void> {
		if (!this._webhookAvailable || !this.webhookClient) {
			// Log this warning only once to avoid spam
			if (!this._hasLoggedWebhookWarning) {
				this.logger.warn('Webhook URL not configured properly. Messages will not be sent via global webhook.');
				this._hasLoggedWebhookWarning = true;
			}
			return;
		}

		try {
			await this.webhookClient.send(messageInfo);
			this.logger.debug('Message sent via webhook');
		} catch (error) {
			this.logger.error('Failed to send message via webhook');
			// We don't have a channel reference here, so we can't fallback
		}
	}

	private async fallbackToRegularMessage(channel: TextChannel, messageInfo: MessageInfo): Promise<void> {
		try {
			// Extract content from messageInfo
			const { content, username, ...rest } = messageInfo;

			// Send a regular message with content only
			await channel.send({
				content: `**${username || 'Bot'}**: ${content || ''}`,
				...rest
			});

			this.logger.debug(`Message sent to channel ${channel.name} via regular message (webhook fallback)`);
		} catch (error) {
			this.logger.error('Failed to send regular message (webhook fallback)');
		}
	}
}
