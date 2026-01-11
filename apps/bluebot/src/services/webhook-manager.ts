// Webhook management service
import { Client, WebhookClient } from 'discord.js';
import { logger, ensureError } from '@starbunk/shared';

export interface WebhookMessage {
	content: string;
	username?: string;
	avatarURL?: string;
	embeds?: any[];
	files?: any[];
}

export class WebhookManager {
	private webhookCache = new Map<string, WebhookClient>();
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	async sendMessage(channelId: string, message: WebhookMessage): Promise<void> {
		// CRITICAL: Debug mode channel filtering safety check
		// This is the final safety net to prevent messages from being sent to non-whitelisted channels
		const { getMessageFilter } = await import('./message-filter');
		const messageFilter = getMessageFilter();

		if (messageFilter.isDebugMode()) {
			const testingChannelIds = messageFilter.getTestingChannelIds();
			if (testingChannelIds.length > 0 && !testingChannelIds.includes(channelId)) {
				logger.warn(
					`[WebhookManager] 🚫 DEBUG MODE: Blocking webhook message to channel ${channelId} - not in TESTING_CHANNEL_IDS whitelist`,
				);
				logger.debug(`[WebhookManager] Whitelisted channels: [${testingChannelIds.join(', ')}]`);
				return; // Silently discard the message
			}
		}

		try {
			const webhook = await this.getOrCreateWebhook(channelId);
			if (!webhook) {
				logger.error(`Failed to get webhook for channel ${channelId}`);
				return;
			}

			await webhook.send({
				content: message.content,
				username: message.username,
				avatarURL: message.avatarURL,
				embeds: message.embeds,
				files: message.files,
			});

			logger.debug(`Webhook message sent to channel ${channelId}`);
		} catch (error) {
			logger.error(`Failed to send webhook message to channel ${channelId}:`, ensureError(error));
		}
	}

	private async getOrCreateWebhook(channelId: string): Promise<WebhookClient | null> {
		// Check cache first
		if (this.webhookCache.has(channelId)) {
			return this.webhookCache.get(channelId)!;
		}

		try {
			const channel = await this.client.channels.fetch(channelId);
			if (!channel || !channel.isTextBased()) {
				logger.error(`Channel ${channelId} is not a text channel`);
				return null;
			}

			// Check if channel supports webhooks (has fetchWebhooks and createWebhook methods)
			if (!('fetchWebhooks' in channel) || !('createWebhook' in channel)) {
				logger.error(`Channel ${channelId} does not support webhooks`);
				return null;
			}

			// Try to find existing webhook
			const webhooks = await channel.fetchWebhooks();
			let webhook = webhooks.find((wh) => wh.name === 'Starbunk Bot' && wh.token);

			// Create webhook if it doesn't exist
			if (!webhook) {
				webhook = await channel.createWebhook({
					name: 'Starbunk Bot',
					reason: 'Bot message delivery',
				});
				logger.info(`Created webhook for channel ${channelId}`);
			}

			// Validate webhook token before creating client
			if (!webhook.token) {
				logger.error(`Webhook for channel ${channelId} has no token`);
				return null;
			}

			// Create webhook client and cache it
			const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });
			this.webhookCache.set(channelId, webhookClient);

			return webhookClient;
		} catch (error) {
			logger.error(`Failed to get or create webhook for channel ${channelId}:`, ensureError(error));
			return null;
		}
	}

	async clearWebhooks(guildId: string): Promise<number> {
		try {
			const guild = await this.client.guilds.fetch(guildId);
			const webhooks = await guild.fetchWebhooks();

			const starbunkWebhooks = webhooks.filter((wh) => wh.name === 'Starbunk Bot');

			for (const webhook of starbunkWebhooks.values()) {
				await webhook.delete('Clearing Starbunk webhooks');
				// Remove from cache
				for (const [channelId, cachedWebhook] of this.webhookCache.entries()) {
					if (cachedWebhook.id === webhook.id) {
						this.webhookCache.delete(channelId);
						break;
					}
				}
			}

			logger.info(`Cleared ${starbunkWebhooks.size} webhooks from guild ${guildId}`);
			return starbunkWebhooks.size;
		} catch (error) {
			logger.error(`Failed to clear webhooks from guild ${guildId}:`, ensureError(error));
			return 0;
		}
	}
}
