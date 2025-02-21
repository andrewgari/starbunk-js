import { Client, Message, TextChannel } from 'discord.js';

import { ReplyBot } from '../../../discord/bots/replyBot';
import { WebhookService } from '../../../discord/services/webhookService';
import { Result } from '../../../utils/result';

export default class NiceBot extends ReplyBot {
  private readonly pattern = /\b69|(sixty-?nine)\b/i;
  private readonly response = 'Nice.';

  constructor(client: Client, webhookService: WebhookService) {
    super(
      'BunkBot',
      'https://pbs.twimg.com/profile_images/421461637325787136/0rxpHzVx.jpeg',
      client,
      webhookService
    );
  }

  canHandle(message: Message): boolean {
    return !message.author.bot && !!message.content.match(this.pattern);
  }

  async processMessage(message: Message): Promise<Result<void, Error>> {
    return this.sendReply(message.channel as TextChannel, this.response);
  }
}
