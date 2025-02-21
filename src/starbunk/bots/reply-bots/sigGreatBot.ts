import { Client, Message, TextChannel } from 'discord.js';

import { ReplyBot } from '../../../discord/bots/replyBot';
import { WebhookService } from '../../../discord/services/webhookService';
import userID from '../../../discord/userID';
import { Result } from '../../../utils/result';

export default class SigGreatBot extends ReplyBot {
  private readonly pattern = /\bsig\b/i;
  private readonly response = 'Sig is great!';

  constructor(client: Client, webhookService: WebhookService) {
    super(
      'SigGreatBot',
      'https://i.imgur.com/example.jpg',
      client,
      webhookService
    );
  }

  canHandle(message: Message): boolean {
    return (
      !message.author.bot &&
      message.author.id === userID.Sig &&
      !!message.content.match(this.pattern)
    );
  }

  async handle(message: Message): Promise<Result<void, Error>> {
    return this.sendReply(message.channel as TextChannel, this.response);
  }
}
