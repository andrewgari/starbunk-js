import { Client, Message, TextChannel, Webhook } from "discord.js";
import { MessageInfo } from "src/bots/MessageInfo";

export class WebhookService {

	getWebhookName(channelName: string) {
		return `Bunkbot-${ channelName }`
	};

	async getWebhookByChannel(channel: TextChannel): Promise<Webhook> {
		return await this.getWebhook(channel.client, channel.id)
	};

	async getWebhook(client: Client, channelID: string): Promise<Webhook> {
		const channel = await client.channels.fetch(channelID) as TextChannel;
		const channelName = this.getWebhookName(channel.name);
		const channelWebhooks = await channel.fetchWebhooks();
		for (let key in channelWebhooks) {
			const webhook = channelWebhooks.get(key);
			if (webhook) {
				return webhook;
			}
		}
		console.log('Could not find webhook, Creating New One.');
		const newWebhook = await channel.createWebhook({
			name: channelName,
			avatar: `https://pbs.twimg.com/profile_images/421461637325787136/0rxpHzVx_400x400.jpeg`
		});
		return newWebhook;
	};

	public async writeMessage(
		channel: TextChannel,
		message: MessageInfo
	): Promise<Message<boolean>> {
		const webhook = await this.getWebhookByChannel(channel);
		if (webhook) {
			return (webhook).send(message);
		}
		return Promise.reject('Could not find webhook');
	};
}

const webhookService = new WebhookService();
export default webhookService;
