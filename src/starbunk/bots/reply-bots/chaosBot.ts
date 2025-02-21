import { Client, Message, TextChannel } from 'discord.js';

import { ReplyBot } from '../../../discord/bots/replyBot';
import { WebhookService } from '../../../discord/services/webhookService';
import { Result } from '../../../utils/result';

export default class ChaosBot extends ReplyBot {
  private readonly pattern = /\bchaos\b/i;
  private readonly response = 'All I know is...I\'m here to kill Chaos';

  constructor(client: Client, webhookService: WebhookService) {
    super(
      'ChaosBot',
      'https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de',
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
