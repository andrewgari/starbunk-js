import { TextChannel, Message, WebhookClient, Webhook, Client } from 'discord.js';
import { BotIdentity } from '@/reply-bots/bot-identity';

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
		if (!this.webhookClient) {
			throw new Error('Webhook client not initialized');
		}

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

		// Get any webhook on this channel with the name matching WEBHOOK_NAME or "WEBHOOK_NAME n"
		const webhooks = await channel.fetchWebhooks();
		const webhook = webhooks.find((wh) => wh.name === WEBHOOK_NAME || wh.name.startsWith(WEBHOOK_NAME + ' '));
		console.debug(`Found webhook: ${webhook ? webhook.name : 'none'}`);

		if (!webhook) {
			throw new Error(`No webhook found matching "${WEBHOOK_NAME}"`);
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
