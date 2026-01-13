import { TextChannel, Message, WebhookClient, Webhook, Client } from 'discord.js';
import { BotIdentity } from '@/reply-bots/models/bot-identity';

const WEBHOOK_NAME = 'BunkBot';

export class WebhookService {
	public webhookClient: WebhookClient | null = null;
	private client: Client;

	constructor(client: Client) {
		this.client = client;
		const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
		if (webhookUrl) {
			this.webhookClient = new WebhookClient({ url: webhookUrl });
		}
	}

	public async send(message: Message, identity: BotIdentity, responseText: string): Promise<Webhook> {
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

		return webhook;
	}

	public async clearWebhooks(guildId: string): Promise<number> {
		try {
			const guild = await this.client.guilds.fetch(guildId);
			const webhooks = await guild.fetchWebhooks();

			const starbunkWebhooks = webhooks.filter((wh) => wh.name === WEBHOOK_NAME);

			for (const webhook of starbunkWebhooks.values()) {
				await webhook.delete('Clearing Starbunk webhooks');
			}

			console.info(`Cleared ${starbunkWebhooks.size} webhooks from guild ${guildId}`);
			return starbunkWebhooks.size;
		} catch (error: Error | unknown) {
			console.error(`Failed to clear webhooks from guild ${guildId}:`, error as Error);
			return 0;
		}
	}

	private async getOrCreateWebhook(channel: TextChannel): Promise<Webhook> {
		const channelId = channel.id;
		// Check if channel supports webhooks (has fetchWebhooks and createWebhook methods)
		if (!('fetchWebhooks' in channel) || !('createWebhook' in channel)) {
			throw new Error(`Channel ${channelId} does not support webhooks`);
		}

		// Try to find existing webhook
		const webhooks = await channel.fetchWebhooks();
		let webhook = webhooks.find((wh) => wh.name === WEBHOOK_NAME || wh.name.startsWith(WEBHOOK_NAME + ' '));
		console.debug(`Found webhook: ${webhook ? webhook.name : 'none'}`);

		// Create webhook if it doesn't exist
		if (!webhook) {
			console.log(`Creating webhook "${WEBHOOK_NAME}" for channel ${channelId}`);
			webhook = await channel.createWebhook({
				name: WEBHOOK_NAME,
				reason: 'BunkBot message delivery',
			});
			console.log(`Created webhook "${WEBHOOK_NAME}" for channel ${channelId}`);
		}

		return webhook;
	}

	private async getTextChannel(channelId: string): Promise<TextChannel> {
		// Fetch the channel from the channelId
		const channel = await this.client.channels.fetch(channelId);

		if (!channel || !channel.isTextBased()) {
			throw new Error(`Channel ${channelId} is not a text channel`);
		}

		return channel as TextChannel;
	}
}
