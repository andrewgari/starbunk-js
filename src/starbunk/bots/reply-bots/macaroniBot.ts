import { Client, Message, TextChannel } from 'discord.js';

import { ReplyBot } from '../../../discord/bots/replyBot';
import roleIDs from '../../../discord/roleIDs';
import { WebhookService } from '../../../discord/services/webhookService';
import { Result, Success } from '../../../utils/result';

export default class MacaroniBot extends ReplyBot {
  private readonly vennPattern = /\bvenn\b/i;
  private readonly macaorniPattern = /\bmacaroni\b/i;
  private readonly macaroniNamePattern =
    /venn(?!.*Tyrone "The "Macaroni" Man" Johnson" Caelum).*/;
  private readonly vennResponse =
    'Correction: you mean Venn "Tyrone "The "Macaroni" Man" Johnson" Caelum';
  private readonly macaroniResponse = (id: string) =>
    `Are you trying to reach <@&${id}>`;

  constructor(client: Client, webhookService: WebhookService) {
    super(
      'MacaroniBot',
      'https://i.imgur.com/fgbH6Xf.jpg',
      client,
      webhookService
    );
  }

  canHandle(message: Message): boolean {
    return (
      !message.author.bot &&
      (!!message.content.match(this.macaorniPattern) ||
        !!message.content.match(this.vennPattern))
    );
  }

  async handle(message: Message): Promise<Result<void, Error>> {
    if (
      message.content.match(this.macaorniPattern) &&
      !message.content.match(this.macaroniNamePattern)
    ) {
      return this.sendReply(message.channel as TextChannel, this.vennResponse);
    }
    if (message.content.match(this.vennPattern)) {
      return this.sendReply(
        message.channel as TextChannel,
        this.macaroniResponse(roleIDs.Macaroni)
      );
    }

    return new Success(void 0);
  }
}
