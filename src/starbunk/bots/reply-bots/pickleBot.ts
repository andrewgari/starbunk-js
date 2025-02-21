import { Client, Message, TextChannel } from 'discord.js';

import { ReplyBot } from '../../../discord/bots/replyBot';
import { WebhookService } from '../../../discord/services/webhookService';
import UserID from '../../../discord/userID';
import Random from '../../../utils/random';
import { Result } from '../../../utils/result';

export default class PickleBot extends ReplyBot {
  private readonly pattern = /gremlin/i;
  private readonly response = 'Could you repeat that? I don\'t speak *gremlin*';

  constructor(client: Client, webhookService: WebhookService) {
    super(
      'GremlinBot',
      'https://i.imgur.com/D0czJFu.jpg',
      client,
      webhookService
    );
  }

  canHandle(message: Message): boolean {
    return (
      !message.author.bot &&
      (!!message.content.match(this.pattern) ||
        (message.author.id === UserID.Sig && Random.percentChance(15)))
    );
  }

  async handle(message: Message): Promise<Result<void, Error>> {
    return this.sendReply(message.channel as TextChannel, this.response);
  }
}
