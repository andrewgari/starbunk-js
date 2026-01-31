import { TextChannel, Message, WebhookClient, Webhook, Client } from 'discord.js';
import { BotIdentity } from '../types/bot-identity';
import { logLayer } from '../observability/log-layer';

const logger = logLayer.withPrefix('WebhookService');

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

  public async send(
    message: Message,
    identity: BotIdentity,
    responseText: string,
  ): Promise<Webhook> {
    logger
      .withMetadata({
        channel_id: message.channelId,
        identity_name: identity.botName,
        response_length: responseText.length,
      })
      .debug('Sending webhook message');

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

    logger
      .withMetadata({
        channel_id: message.channelId,
        channel_name: channel.name,
        identity_name: identity.botName,
        webhook_id: webhook.id,
      })
      .info('Webhook message sent successfully');

    return webhook;
  }

  public async clearWebhooks(guildId: string): Promise<number> {
    logger.withMetadata({ guild_id: guildId }).info('Clearing webhooks from guild');

    try {
      const guild = await this.client.guilds.fetch(guildId);
      const webhooks = await guild.fetchWebhooks();

      const starbunkWebhooks = webhooks.filter(wh => wh.name === WEBHOOK_NAME);

      logger
        .withMetadata({
          guild_id: guildId,
          webhook_count: starbunkWebhooks.size,
        })
        .info(`Found ${starbunkWebhooks.size} webhooks to clear`);

      for (const webhook of starbunkWebhooks.values()) {
        await webhook.delete('Clearing Starbunk webhooks');
        logger
          .withMetadata({
            webhook_id: webhook.id,
            webhook_name: webhook.name,
          })
          .debug('Webhook deleted');
      }

      logger
        .withMetadata({
          guild_id: guildId,
          webhooks_cleared: starbunkWebhooks.size,
        })
        .info(`Cleared webhooks from guild`);
      return starbunkWebhooks.size;
    } catch (error: unknown) {
      logger
        .withError(error instanceof Error ? error : new Error(String(error)))
        .withMetadata({
          guild_id: guildId,
        })
        .error(`Failed to clear webhooks from guild`);
      return 0;
    }
  }

  private async getOrCreateWebhook(channel: TextChannel): Promise<Webhook> {
    const channelId = channel.id;
    const channelType = channel.type;

    // Check if channel supports webhooks (has fetchWebhooks and createWebhook methods)
    if (!('fetchWebhooks' in channel) || !('createWebhook' in channel)) {
      logger
        .withMetadata({
          channel_id: channelId,
          channel_type: channelType,
        })
        .error('Channel does not support webhooks');
      throw new Error(`Channel ${channelId} does not support webhooks`);
    }

    // Try to find existing webhook
    logger.withMetadata({ channel_id: channelId }).debug('Fetching webhooks for channel');
    const webhooks = await channel.fetchWebhooks();
    let webhook = webhooks.find(
      wh => wh.name === WEBHOOK_NAME || wh.name.startsWith(WEBHOOK_NAME + ' '),
    );

    if (webhook) {
      logger
        .withMetadata({
          channel_id: channelId,
          webhook_id: webhook.id,
          webhook_name: webhook.name,
        })
        .debug('Using existing webhook');
    } else {
      // Create webhook if it doesn't exist
      logger
        .withMetadata({
          channel_id: channelId,
          channel_name: channel.name,
          webhook_name: WEBHOOK_NAME,
        })
        .info('Creating new webhook for channel');

      webhook = await channel.createWebhook({
        name: WEBHOOK_NAME,
        reason: 'BunkBot message delivery',
      });

      logger
        .withMetadata({
          channel_id: channelId,
          webhook_id: webhook.id,
          webhook_name: webhook.name,
        })
        .info('Webhook created successfully');
    }

    return webhook;
  }

  private async getTextChannel(channelId: string): Promise<TextChannel> {
    logger.withMetadata({ channel_id: channelId }).debug('Fetching text channel');

    // Fetch the channel from the channelId
    const channel = await this.client.channels.fetch(channelId);

    if (!channel || !channel.isTextBased()) {
      logger
        .withMetadata({
          channel_id: channelId,
          channel_type: channel?.type,
        })
        .error('Channel is not a text channel');
      throw new Error(`Channel ${channelId} is not a text channel`);
    }

    logger
      .withMetadata({
        channel_id: channelId,
        channel_name: (channel as TextChannel).name,
      })
      .debug('Text channel fetched successfully');

    return channel as TextChannel;
  }
}
