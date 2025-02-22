import { Client, Message, TextChannel, Webhook } from 'discord.js';
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

	public async writeMessage(channel: TextChannel, message: MessageInfo): Promise<Message<boolean>> {
		const webhook = await this.getChannelWebhook(channel);
		if (webhook) {
			try {
				return webhook.send(message);
			} catch (e) {
				console.error('Failed to send message', e);
			}
		}
		return Promise.reject('Could not find webhook');
	}
}

const webhookService = new WebhookService();
export default webhookService;
