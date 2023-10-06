import { Client, Message, TextChannel, Webhook } from 'discord.js';
import { MessageInfo } from '../bots/messageInfo';

export class WebhookService {
  getWebhookName(channelName: string) {
    return `Bunkbot-${channelName}`;
  }

  async getChannelWebhook(channel: TextChannel): Promise<Webhook> {
    const channelName = this.getWebhookName(channel.name);
    const channelWebhooks = await channel.fetchWebhooks();
    for (let pair of channelWebhooks) {
      const webhook = pair[1];
      console.log('webhookName', webhook?.name);
      console.log('channelName', channelName);
      if (webhook?.name === channelName) {
        return webhook;
      }
    }
    console.log('Could not find webhook, Creating New One.');
    return this.createWebhook(channel, channelName);
  }

  async getWebhook(client: Client, channelID: string): Promise<Webhook> {
    const channel = (await client.channels.fetch(channelID)) as TextChannel;
    return this.getChannelWebhook(channel);
  }

  private async createWebhook(channel: TextChannel, channelName: string) {
    return await channel.createWebhook({
      name: channelName,
      avatar: `https://pbs.twimg.com/profile_images/421461637325787136/0rxpHzVx_400x400.jpeg`
    });
  }

  public async writeMessage(
    channel: TextChannel,
    message: MessageInfo
  ): Promise<Message<boolean>> {
    const webhook = await this.getChannelWebhook(channel);
    if (webhook) {
      return webhook.send(message);
    }
    return Promise.reject('Could not find webhook');
  }
}

const webhookService = new WebhookService();
export default webhookService;
