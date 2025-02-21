import { Client, Message, TextChannel } from 'discord.js';

import { ReplyBot } from '../../../discord/bots/replyBot';
import { WebhookService } from '../../../discord/services/webhookService';
import { Result } from '../../../utils/result';

export default class SheeshBot extends ReplyBot {
  private readonly pattern = /\bshee+sh\b/i;

  constructor(client: Client, webhookService: WebhookService) {
    super(
      'SheeshBot',
      'https://i.imgflip.com/5fc2iz.png?a471000',
      client,
      webhookService
    );
  }

  canHandle(message: Message): boolean {
    return !message.author.bot && !!message.content.match(this.pattern);
  }

  async handle(message: Message): Promise<Result<void, Error>> {
    return this.sendReply(message.channel as TextChannel, this.getResponse());
  }

  private getResponse(): string {
    const numberOfEs = Math.floor(Math.random() * 10) + 3;

    return `Sh${'e'.repeat(numberOfEs)}sh!`;
  }
}
