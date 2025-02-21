import { Client, Message, TextChannel } from 'discord.js';

import { ReplyBot } from '../../../discord/bots/replyBot';
import { WebhookService } from '../../../discord/services/webhookService';
import Random from '../../../utils/random';
import { Result } from '../../../utils/result';

export default class BotBot extends ReplyBot {
  protected readonly response = 'Hello fellow bot!';

  constructor(client: Client, webhookService: WebhookService) {
    super(
      'Botbot',
      'https://cdn-icons-png.flaticon.com/512/4944/4944377.png',
      client,
      webhookService
    );
  }

  canHandle(message: Message): boolean {
    return (
      !this.isSelf(message) && message.author.bot && Random.percentChance(10)
    );
  }

  async handle(message: Message): Promise<Result<void, Error>> {
    return this.sendReply(message.channel as TextChannel, this.response);
  }
}
