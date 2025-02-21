import { Client, Message, TextChannel } from 'discord.js';

import { ReplyBot } from '../../../discord/bots/replyBot';
import roleIDs from '../../../discord/roleIDs';
import { WebhookService } from '../../../discord/services/webhookService';
import { Result } from '../../../utils/result';

export default class SoggyBot extends ReplyBot {
  private readonly pattern = /wet bread/i;
  private readonly response = 'Sounds like somebody enjoys wet bread';

  constructor(client: Client, webhookService: WebhookService) {
    super('SoggyBot', 'https://imgur.com/OCB6i4x.jpg', client, webhookService);
  }

  canHandle(message: Message): boolean {
    return (
      !message.author.bot &&
      !!message.content.match(this.pattern) &&
      (message.member?.roles.cache.some(
        (role) => role.id === roleIDs.WetBread
      ) ??
        false)
    );
  }

  async processMessage(message: Message): Promise<Result<void, Error>> {
    return this.sendReply(message.channel as TextChannel, this.response);
  }
}
