import { Client, Message, TextChannel } from 'discord.js';
import { MessageHandler } from '../handlers/messageHandler';
import { WebhookService } from '../services/webhookService';
import { Result, Success, Failure } from '../../utils/result';

export interface BotConfig {
  name: string;
  avatarUrl: string;
}

export abstract class BaseBot implements MessageHandler {
  constructor(
    protected readonly config: BotConfig,
    protected readonly client: Client,
    protected readonly webhookService: WebhookService
  ) {}

  abstract canHandle(message: Message): boolean;

  async handle(message: Message): Promise<Result<void, Error>> {
    if (!(message.channel instanceof TextChannel)) {
      return new Failure(new Error('Message not in text channel'));
    }

    if (this.isOwnMessage(message)) {
      return new Success(void 0);
    }

    return this.processMessage(message);
  }

  protected abstract processMessage(
    message: Message
  ): Promise<Result<void, Error>>;

  protected isOwnMessage(message: Message): boolean {
    return message.author.bot && message.author.username === this.config.name;
  }

  protected async sendReply(
    channel: TextChannel,
    content: string
  ): Promise<Result<void, Error>> {
    const webhookResult = await this.webhookService.getOrCreateWebhook(channel);
    if (webhookResult.isFailure()) return webhookResult;

    try {
      await webhookResult.value.send({
        username: this.config.name,
        avatarURL: this.config.avatarUrl,
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
