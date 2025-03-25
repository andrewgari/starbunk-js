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
			// Validate the messageInfo to ensure it has all required fields with valid values
			if (!this.validateMessageInfo(messageInfo)) {
				this.logger.warn('Invalid message info provided, using fallback values');
				// Set fallback values to ensure we don't use undefined values
				messageInfo = this.ensureValidMessageInfo(messageInfo);
			}

			// Transform botName/avatarUrl to username/avatarURL if needed
			const transformedInfo: MessageInfo = {
				...messageInfo,
				username: messageInfo.username || messageInfo.botName,
				avatarURL: messageInfo.avatarURL || messageInfo.avatarUrl
			};
			delete transformedInfo.botName;
			delete transformedInfo.avatarUrl;

			// Create a unique webhook name based on the bot's username
			// This prevents identity conflicts between different bots
			const webhookName = `${transformedInfo.username?.replace(/\s+/g, '-')}-webhook`.substring(0, 32);

			// Try to use webhooks - find a matching webhook for this bot if possible
			const webhooks = await channel.fetchWebhooks();
			let webhook = webhooks.find(wh => wh.name === webhookName);

			if (!webhook) {
				try {
					webhook = await channel.createWebhook({
						name: webhookName,
						avatar: transformedInfo.avatarURL,
					});
					this.logger.debug(`Created new webhook "${webhookName}" for ${transformedInfo.username}`);
				} catch (webhookCreationError) {
					// If creating webhook fails, fall back to regular message
					this.logger.warn(`Failed to create webhook "${webhookName}", falling back to regular message: ${webhookCreationError instanceof Error ? webhookCreationError.message : String(webhookCreationError)}`);
					await this.fallbackToRegularMessage(channel, transformedInfo);
					return;
				}
			}

			await webhook.send(transformedInfo);
			this.logger.debug(`Message sent to channel ${channel.name} via webhook "${webhookName}"`);
		} catch (error) {
			this.logger.warn(`Failed to send webhook message: ${error instanceof Error ? error.message : String(error)}`);
			await this.fallbackToRegularMessage(channel, messageInfo);
		}
	}

	/**
	 * Validates that the message info contains all required fields with valid values
	 */
	private validateMessageInfo(messageInfo: MessageInfo): boolean {
		// Check if we have either username or botName
		const hasName = !!(messageInfo.username || messageInfo.botName);

		// Check if we have either avatarURL or avatarUrl
		const hasAvatar = !!(messageInfo.avatarURL || messageInfo.avatarUrl);

		// Check if we have content
		const hasContent = !!messageInfo.content;

		return hasName && hasAvatar && hasContent;
	}

	/**
	 * Ensures the message info has valid values, adding defaults when needed
	 */
	private ensureValidMessageInfo(messageInfo: MessageInfo): MessageInfo {
		return {
			...messageInfo,
			content: messageInfo.content || 'No message content provided',
			username: messageInfo.username || messageInfo.botName || 'Unknown Bot',
			avatarURL: messageInfo.avatarURL || messageInfo.avatarUrl || 'https://i.imgur.com/NtfJZP5.png' // Default avatar
		};
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
