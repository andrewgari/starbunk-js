import { Client, Message, TextChannel } from 'discord.js';

import { ReplyBot } from '../../../discord/bots/replyBot';
import { WebhookService } from '../../../discord/services/webhookService';
import { Result } from '../../../utils/result';

export default class GundamBot extends ReplyBot {
  private readonly pattern = /\bg(u|a)ndam\b/i;
  private readonly response =
    'That\'s the famous Unicorn Robot, "Gandum". There, I said it.';

  constructor(client: Client, webhookService: WebhookService) {
    super(
      'GundamBot',
      'https://a1.cdn.japantravel.com/photo/41317-179698/1440x960!/tokyo-unicorn-gundam-statue-in-odaiba-179698.jpg',
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
