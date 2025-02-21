import { Client, TextChannel, Webhook, WebhookCreateOptions } from 'discord.js';

import { Failure, Result, Success } from '@/utils/result';

export interface WebhookConfig {
  defaultAvatarUrl: string;
  namePrefix: string;
}

export class WebhookService {
  private readonly config: WebhookConfig;
  private readonly client: Client;

  constructor(config: WebhookConfig, client: Client) {
    this.config = config;
    this.client = client;
  }

  async getOrCreateWebhook(
    channel: TextChannel
  ): Promise<Result<Webhook, Error>> {
    try {
      const webhook = await this.findExistingWebhook(channel);
      if (webhook) return new Success(webhook);

      return await this.createWebhook(channel);
    }
    catch (error) {
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
    }
    catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error('Failed to create webhook')
      );
    }
  }

  async sendMessage(
    channel: TextChannel,
    options: { username: string; avatarURL: string; content: string }
  ): Promise<Result<void, Error>> {
    try {
      const webhookResult = await this.getOrCreateWebhook(channel);
      if (webhookResult.isFailure()) return webhookResult;

      await webhookResult.value.send(options);

      return new Success(void 0);
    }
    catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error('Failed to send message')
      );
    }
  }
}
