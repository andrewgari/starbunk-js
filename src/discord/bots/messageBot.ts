import { Client, Message, TextChannel } from 'discord.js';

import { Failure, Result, Success } from '@/utils/result';

import { WebhookService } from '../services/webhookService';
import { MessageBot } from './types';

export abstract class BasicMessageBot implements MessageBot {
  protected readonly webhookService: WebhookService;

  constructor(
    private readonly name: string,
    private readonly avatarUrl: string,
    protected readonly client: Client,
    protected readonly _webhookService: WebhookService
  ) {
    this.name = name;
    this.avatarUrl = avatarUrl;
    this.client = client;
    this.webhookService = _webhookService;
  }

  getName(): string {
    return this.name;
  }

  getAvatarUrl(): string {
    return this.avatarUrl;
  }

  abstract canHandle(message: Message): boolean;
  abstract handle(message: Message): Promise<Result<void, Error>>;

  async sendReply(
    channel: TextChannel,
    content: string
  ): Promise<Result<void, Error>> {
    try {
      const webhookResult = await this.webhookService.getOrCreateWebhook(
        channel
      );
      if (webhookResult.isFailure()) return webhookResult;

      await webhookResult.value.send({
        username: this.name,
        avatarURL: this.avatarUrl,
        content
      });

      return new Success(void 0);
    }
    catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error('Failed to send message')
      );
    }
  }
}
