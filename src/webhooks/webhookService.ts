import { Client, Message, TextChannel, Webhook } from 'discord.js';
import guildIds from '../discord/guildIds';
import { MessageInfo } from '../discord/messageInfo';
import { ILogger } from '../services/logger';
import loggerFactory from '../services/loggerFactory';
import container from '../services/serviceContainer';
import { serviceRegistry } from '../services/serviceRegistry';

export interface IWebhookService {
	getChannelWebhook(channel: TextChannel): Promise<Webhook>;
	getWebhook(client: Client, channelID: string): Promise<Webhook>;
	writeMessage(channel: TextChannel, message: MessageInfo): Promise<Message<boolean>>;
}

export class WebhookService implements IWebhookService {
	private logger: ILogger;

	constructor(logger?: ILogger) {
		this.logger = logger || loggerFactory.getLogger();
	}

	getWebhookName(channelName: string, isSnowbunk: boolean): string {
		return `${isSnowbunk ? 'Snowbunk' : 'CovaDax'}Bunkbot-${channelName}`;
	}

	async getChannelWebhook(channel: TextChannel): Promise<Webhook> {
		const isSnowbunk = channel.guild.id === guildIds.Snowfall;
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
				this.logger.error('Failed to send message', e as Error);
			}
		}
		return Promise.reject('Could not find webhook');
	}
}

// Create and register the default webhook service
const webhookService = new WebhookService();
container.register(serviceRegistry.WEBHOOK_SERVICE, webhookService);

export default webhookService;
