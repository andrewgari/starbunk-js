import { TextChannel, Message, WebhookClient, Webhook, Client } from 'discord.js';
import { BotIdentity } from '@/reply-bots/models/bot-identity';
import { logger } from '@/observability/logger';

const WEBHOOK_NAME = 'BunkBot';

export class WebhookService {
	public webhookClient: WebhookClient | null = null;
	private client: Client;

	constructor(client: Client) {
		this.client = client;
		const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
		if (webhookUrl) {
			this.webhookClient = new WebhookClient({ url: webhookUrl });
			logger.info('Webhook client initialized from URL');
		} else {
			logger.debug('No webhook URL provided, will create webhooks per channel');
		}
	}

	public async send(message: Message, identity: BotIdentity, responseText: string): Promise<Webhook> {
		logger.debug('Sending webhook message', {
			channel_id: message.channelId,
			identity_name: identity.botName,
			response_length: responseText.length,
		});

		// Get Channel
		const channel = await this.getTextChannel(message.channelId);

		// Get Webhook
		const webhook = await this.getOrCreateWebhook(channel);

		// Send Message
		await webhook.send({
			content: responseText,
			username: identity.botName,
			avatarURL: identity.avatarUrl,
			embeds: message.embeds,
		});

		logger.info('Webhook message sent successfully', {
			channel_id: message.channelId,
			channel_name: channel.name,
			identity_name: identity.botName,
			webhook_id: webhook.id,
		});

		return webhook;
	}

	public async clearWebhooks(guildId: string): Promise<number> {
		logger.info('Clearing webhooks from guild', { guild_id: guildId });

		try {
			const guild = await this.client.guilds.fetch(guildId);
			const webhooks = await guild.fetchWebhooks();

			const starbunkWebhooks = webhooks.filter((wh) => wh.name === WEBHOOK_NAME);

			logger.info(`Found ${starbunkWebhooks.size} webhooks to clear`, {
				guild_id: guildId,
				webhook_count: starbunkWebhooks.size,
			});

			for (const webhook of starbunkWebhooks.values()) {
				await webhook.delete('Clearing Starbunk webhooks');
				logger.debug('Webhook deleted', {
					webhook_id: webhook.id,
					webhook_name: webhook.name,
				});
			}

			logger.info(`Cleared webhooks from guild`, {
				guild_id: guildId,
				webhooks_cleared: starbunkWebhooks.size,
			});
			return starbunkWebhooks.size;
		} catch (error: Error | unknown) {
			logger.error(`Failed to clear webhooks from guild`, error, {
				guild_id: guildId,
			});
			return 0;
		}
	}

	private async getOrCreateWebhook(channel: TextChannel): Promise<Webhook> {
		const channelId = channel.id;

		// Check if channel supports webhooks (has fetchWebhooks and createWebhook methods)
		if (!('fetchWebhooks' in channel) || !('createWebhook' in channel)) {
			logger.error('Channel does not support webhooks', undefined, {
				channel_id: channelId,
				channel_type: (channel as any).type,
			});
			throw new Error(`Channel ${channelId} does not support webhooks`);
		}

		// Try to find existing webhook
		logger.debug('Fetching webhooks for channel', { channel_id: channelId });
		const webhooks = await channel.fetchWebhooks();
		let webhook = webhooks.find((wh) => wh.name === WEBHOOK_NAME || wh.name.startsWith(WEBHOOK_NAME + ' '));

		if (webhook) {
			logger.debug('Using existing webhook', {
				channel_id: channelId,
				webhook_id: webhook.id,
				webhook_name: webhook.name,
			});
		} else {
			// Create webhook if it doesn't exist
			logger.info('Creating new webhook for channel', {
				channel_id: channelId,
				channel_name: channel.name,
				webhook_name: WEBHOOK_NAME,
			});

			webhook = await channel.createWebhook({
				name: WEBHOOK_NAME,
				reason: 'BunkBot message delivery',
			});

			logger.info('Webhook created successfully', {
				channel_id: channelId,
				webhook_id: webhook.id,
				webhook_name: webhook.name,
			});
		}

		return webhook;
	}

	private async getTextChannel(channelId: string): Promise<TextChannel> {
		logger.debug('Fetching text channel', { channel_id: channelId });

		// Fetch the channel from the channelId
		const channel = await this.client.channels.fetch(channelId);

		if (!channel || !channel.isTextBased()) {
			logger.error('Channel is not a text channel', undefined, {
				channel_id: channelId,
				channel_type: channel?.type,
			});
			throw new Error(`Channel ${channelId} is not a text channel`);
		}

		logger.debug('Text channel fetched successfully', {
			channel_id: channelId,
			channel_name: (channel as TextChannel).name,
		});

		return channel as TextChannel;
	}
}
