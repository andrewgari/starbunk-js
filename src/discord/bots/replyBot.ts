import { Client, Message, TextChannel } from 'discord.js';

import { Failure, Result, Success } from '@/utils/result';

import { WebhookService } from '../services/webhookService';

export abstract class ReplyBot {
  constructor(
    protected readonly name: string,
    protected avatarUrl: string,
    protected readonly client: Client,
    protected readonly webhookService: WebhookService
  ) {
    if (!name) throw new Error('Bot name is required');
    if (!avatarUrl) throw new Error('Bot avatar URL is required');
    if (!client) throw new Error('Discord client is required');
    if (!webhookService) throw new Error('Webhook service is required');
  }

  getName(): string {
    return this.name;
  }

  getAvatarUrl(): string {
    return this.avatarUrl;
  }

  protected setAvatarUrl(url: string): void {
    this.avatarUrl = url;
  }

  protected isSelf(message: Message): boolean {
    return message.author.bot && message.author.username === this.getName();
  }

  abstract canHandle(message: Message): boolean;
  abstract handle(message: Message): Promise<Result<void, Error>>;

  protected async sendReply(
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
