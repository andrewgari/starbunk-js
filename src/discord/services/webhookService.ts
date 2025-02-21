import { Client, TextChannel, Webhook, WebhookCreateOptions } from 'discord.js';
import { Result, Success, Failure } from '@/utils/result';

export interface WebhookConfig {
  defaultAvatarUrl: string;
  namePrefix: string;
}

export class WebhookService {
  constructor(
    private readonly config: WebhookConfig,
    private readonly client: Client
  ) {}

  async getOrCreateWebhook(
    channel: TextChannel
  ): Promise<Result<Webhook, Error>> {
    try {
      const webhook = await this.findExistingWebhook(channel);
      if (webhook) return new Success(webhook);

      return await this.createWebhook(channel);
    } catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  private async findExistingWebhook(
    channel: TextChannel
  ): Promise<Webhook | null> {
    const webhooks = await channel.fetchWebhooks();
    return (
      webhooks.find((w) => w.name.startsWith(this.config.namePrefix)) ?? null
    );
  }

  private async createWebhook(
    channel: TextChannel
  ): Promise<Result<Webhook, Error>> {
    try {
      const options: WebhookCreateOptions = {
        name: `${this.config.namePrefix}-${channel.name}`,
        avatar: this.config.defaultAvatarUrl,
        channel: channel
      };

      const webhook = await channel.createWebhook(options);
      return new Success(webhook);
    } catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error('Failed to create webhook')
      );
    }
  }
}
