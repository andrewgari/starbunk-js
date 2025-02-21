import { Client, Message, TextChannel } from 'discord.js';

import { ReplyBot } from '../../../discord/bots/replyBot';
import { WebhookService } from '../../../discord/services/webhookService';
import { Result } from '../../../utils/result';

export default class CheckBot extends ReplyBot {
  private readonly pattern = /\bczech\b/i;
  private readonly response = 'I believe you mean \'check\'.';

  constructor(client: Client, webhookService: WebhookService) {
    super(
      'CheckBot',
      'https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg',
      client,
      webhookService
    );
  }

  canHandle(message: Message): boolean {
    return !message.author.bot && !!message.content.match(this.pattern);
  }

  async handle(message: Message): Promise<Result<void, Error>> {
    return this.sendReply(message.channel as TextChannel, this.response);
  }
}
