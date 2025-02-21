import { TextChannel, WebhookClient, WebhookMessageCreateOptions } from 'discord.js';
import { MessageInfo } from '../discord/messageInfo';
import guildIDs from '../discord/guildIDs';

interface WebhookCache {
  [channelId: string]: WebhookClient;
}

class WebhookService {
  private webhooks: WebhookCache = {};

  private getWebhookName(channelName: string, isSnowbunk: boolean): string {
    return `${isSnowbunk ? 'Snowbunk' : 'StarBunk'}Bunkbot-${channelName}`;
  }

  async getChannelWebhook(channel: TextChannel): Promise<WebhookClient> {
    const isSnowbunk = channel.guild.id === guildIDs.Snowfall;
    const channelName = this.getWebhookName(channel.name, isSnowbunk);
    const channelWebhooks = await channel.fetchWebhooks();
    
    for (const [_, webhook] of channelWebhooks) {
      if (webhook?.name === channelName && webhook.token) {
        return new WebhookClient({ id: webhook.id, token: webhook.token });
      }
    }
    return this.createWebhook(channel);
  }

  async getWebhook(channel: TextChannel): Promise<WebhookClient> {
    return this.getChannelWebhook(channel);
  }

  private async createWebhook(channel: TextChannel): Promise<WebhookClient> {
    const webhooks = await channel.fetchWebhooks();
    const existingWebhook = webhooks.find(hook => hook.token !== null);

    if (existingWebhook?.token) {
      return new WebhookClient({ id: existingWebhook.id, token: existingWebhook.token });
    }

    const newWebhook = await channel.createWebhook({
      name: 'BunkBot Webhook',
      avatar: 'https://i.imgur.com/AfFp7pu.png'
    });

    if (!newWebhook.token) {
      throw new Error('Failed to create webhook: No token available');
    }

    return new WebhookClient({ id: newWebhook.id, token: newWebhook.token });
  }

  private async getOrCreateWebhook(channel: TextChannel): Promise<WebhookClient> {
    if (this.webhooks[channel.id]) {
      return this.webhooks[channel.id];
    }

    const isSnowbunk = channel.guild.id === guildIDs.Snowfall;
    const channelName = this.getWebhookName(channel.name, isSnowbunk);
    
    const webhooks = await channel.fetchWebhooks();
    const existingWebhook = webhooks.find(hook => 
      hook.token !== null && hook.name === channelName
    );

    if (existingWebhook?.token) {
      const webhook = new WebhookClient({ id: existingWebhook.id, token: existingWebhook.token });
      this.webhooks[channel.id] = webhook;
      return webhook;
    }

    const newWebhook = await channel.createWebhook({
      name: channelName,
      avatar: 'https://i.imgur.com/AfFp7pu.png'
    });

    if (!newWebhook.token) {
      throw new Error('Failed to create webhook: No token available');
    }

    const webhook = new WebhookClient({ id: newWebhook.id, token: newWebhook.token });
    this.webhooks[channel.id] = webhook;
    return webhook;
  }

  public async writeMessage(
    channel: TextChannel,
    options: WebhookMessageCreateOptions
  ): Promise<void> {
    try {
      const webhook = await this.getOrCreateWebhook(channel);
      await webhook.send(options);
    } catch (error) {
      console.error('Failed to send webhook message:', error);
      throw error;
    }
  }
}

export default new WebhookService();
