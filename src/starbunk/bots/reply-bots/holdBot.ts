import { Client, Message, TextChannel } from 'discord.js';

import { ReplyBot } from '../../../discord/bots/replyBot';
import { WebhookService } from '../../../discord/services/webhookService';
import { Result } from '../../../utils/result';

export default class HoldBot extends ReplyBot {
  private readonly pattern = /^Hold\.?$/i;
  private readonly response = 'Hold.';

  constructor(client: Client, webhookService: WebhookService) {
    super('HoldBot', 'https://i.imgur.com/YPFGEzM.png', client, webhookService);
  }

  canHandle(message: Message): boolean {
    return !message.author.bot && !!message.content.match(this.pattern);
  }

  async handle(message: Message): Promise<Result<void, Error>> {
    return this.sendReply(message.channel as TextChannel, this.response);
  }

  async processMessage(message: Message): Promise<Result<void, Error>> {
    return this.sendReply(message.channel as TextChannel, this.response);
  }
}
