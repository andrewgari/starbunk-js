import { Client, Message, TextChannel } from 'discord.js';

import { ReplyBot } from '../../../discord/bots/replyBot';
import { WebhookService } from '../../../discord/services/webhookService';
import { Result } from '../../../utils/result';

export default class SpiderBot extends ReplyBot {
  private readonly pattern = /\bspider\s?man\b/i;
  private readonly response =
    'Hey, it\'s "**Spider-Man**"! Don\'t forget the hyphen! Not Spiderman, that\'s dumb';

  constructor(client: Client, webhookService: WebhookService) {
    super(
      'Spider-Bot',
      'https://i.pinimg.com/736x/33/e0/06/33e00653eb485455ce5121b413b26d3b.jpg',
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
