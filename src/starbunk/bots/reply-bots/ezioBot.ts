import { Client, Message, TextChannel } from 'discord.js';

import { ReplyBot } from '../../../discord/bots/replyBot';
import { WebhookService } from '../../../discord/services/webhookService';
import { Result } from '../../../utils/result';

export default class EzioBot extends ReplyBot {
  private readonly pattern = /\bezio|h?assassin.*\b/i;

  constructor(client: Client, webhookService: WebhookService) {
    super(
      'Ezio Auditore Da Firenze',
      'https://www.creativeuncut.com/gallery-12/art/ac2-ezio5.jpg',
      client,
      webhookService
    );
  }

  canHandle(message: Message): boolean {
    return !message.author.bot && !!message.content.match(this.pattern);
  }

  async processMessage(message: Message): Promise<Result<void, Error>> {
    return this.sendReply(
      message.channel as TextChannel,
      `Remember ${message.author.displayName}, Nothing is true; Everything is permitted.`
    );
  }
}
