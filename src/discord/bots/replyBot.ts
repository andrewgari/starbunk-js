import { Client, Message, TextChannel } from 'discord.js';
import { MessageBot } from './types';
import { BaseBot, BotConfig } from './baseBot';
import { WebhookService } from '../services/webhookService';
import { Result, Success, Failure } from '@/utils/result';

export abstract class ReplyBot extends BaseBot implements MessageBot {
  constructor(
    name: string,
    avatarUrl: string,
    client: Client,
    webhookService: WebhookService
  ) {
    super({ name, avatarUrl }, client, webhookService);
  }

  abstract canHandle(message: Message): boolean;
  abstract processMessage(message: Message): Promise<Result<void, Error>>;

  public async sendReply(
    channel: TextChannel,
    content: string
  ): Promise<Result<void, Error>> {
    try {
      const webhookResult = await this.webhookService.getOrCreateWebhook(
        channel
      );
      if (webhookResult.isFailure()) return webhookResult;

      await webhookResult.value.send({
        username: this.botName,
        avatarURL: this.avatarUrl,
        content
      });

      return new Success(void 0);
    } catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error('Failed to send message')
      );
    }
  }
}
