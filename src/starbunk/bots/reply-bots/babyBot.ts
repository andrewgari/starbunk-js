import { Client, Message, TextChannel } from 'discord.js';

import { ReplyBot } from '../../../discord/bots/replyBot';
import { WebhookService } from '../../../discord/services/webhookService';
import { Result } from '../../../utils/result';

export default class BabyBot extends ReplyBot {
  private readonly pattern = /\bbaby\b/i;
  private readonly response =
    'https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus-aran.gif';

  constructor(client: Client, webhookService: WebhookService) {
    super(
      'BabyBot',
      'https://i.redd.it/qc9qus78dc581.jpg',
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
