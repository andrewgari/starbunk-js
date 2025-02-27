import { Client, Message, TextChannel, Webhook } from 'discord.js';
import { getClient } from '../discord/clientInstance';
import guildIDs from '../discord/guildIDs';
import { MessageInfo } from '../discord/messageInfo';

export class WebhookService {
	getWebhookName(channelName: string, isSnowbunk: boolean): string {
		return `${isSnowbunk ? 'Snowbunk' : 'StarBunk'}Bunkbot-${channelName}`;
	}

	async getChannelWebhook(channel: TextChannel): Promise<Webhook> {
		const isSnowbunk = channel.guild.id === guildIDs.Snowfall;
		const channelName = this.getWebhookName(channel.name, isSnowbunk);
		const channelWebhooks = await channel.fetchWebhooks();
		for (const pair of channelWebhooks) {
			const webhook = pair[1];
			if (webhook?.name === channelName) {
				return webhook;
			}
		}
		return this.createWebhook(channel, channelName);
	}

	async getWebhook(client: Client, channelID: string): Promise<Webhook> {
		const channel = (await client.channels.fetch(channelID)) as TextChannel;
		return this.getChannelWebhook(channel);
	}

	private async createWebhook(channel: TextChannel, channelName: string): Promise<Webhook> {
		return await channel.createWebhook({
			name: channelName,
			avatar: 'https://pbs.twimg.com/profile_images/421461637325787136/0rxpHzVx_400x400.jpeg',
		});
	}

	/**
	 * Send a message using a webhook
	 * @param channel The channel to send the message to
	 * @param message The message info to send
	 * @returns The sent message
	 */
	public async writeMessage(channel: TextChannel, message: MessageInfo): Promise<Message<boolean>>;

	/**
	 * Send a message using a webhook
	 * @param channelId The ID of the channel to send the message to
	 * @param content The content of the message
	 * @param username The username to display for the webhook
	 * @param avatarURL The avatar URL to use for the webhook
	 * @returns The sent message
	 */
	public async writeMessage(
		channelId: string,
		content: string,
		username: string,
		avatarURL: string
	): Promise<Message<boolean>>;

	// Implementation that handles both overloads
	public async writeMessage(
		channelOrId: TextChannel | string,
		messageOrContent: MessageInfo | string,
		username?: string,
		avatarURL?: string
	): Promise<Message<boolean>> {
		try {
			// Handle the new overload
			if (typeof channelOrId === 'string' && typeof messageOrContent === 'string') {
				// Get the channel from the ID
				const client = getClient();
				const channel = await client.channels.fetch(channelOrId) as TextChannel;

				// Create the message info
				const messageInfo: MessageInfo = {
					content: messageOrContent,
					username: username || 'Bot',
					avatarURL: avatarURL || '',
					embeds: []
				};

				// Send the message
				const webhook = await this.getChannelWebhook(channel);
				if (webhook) {
					return await webhook.send(messageInfo);
				}
				return Promise.reject('Could not find webhook');
			}

			// Handle the original overload
			const channel = channelOrId as TextChannel;
			const message = messageOrContent as MessageInfo;

			const webhook = await this.getChannelWebhook(channel);
			if (webhook) {
				return await webhook.send(message);
			}
			return Promise.reject('Could not find webhook');
		} catch (error) {
			console.error('Failed to send message', error);
			return Promise.reject(error);
		}
	}
}

const webhookService = new WebhookService();
export default webhookService;
