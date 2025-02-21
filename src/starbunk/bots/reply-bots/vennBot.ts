import { Client, Message, TextChannel } from 'discord.js';

import { ReplyBot } from '../../../discord/bots/replyBot';
import { WebhookService } from '../../../discord/services/webhookService';
import userID from '../../../discord/userID';
import random from '../../../utils/random';
import { Result } from '../../../utils/result';

export default class VennBot extends ReplyBot {
  private readonly pattern = /\bcringe\b/i;
  private readonly responses = [
    'Sorry, but that was über cringe...',
    'Geez, that was hella cringe...',
    'That was cringe to the max...',
    'What a cringe thing to say...',
    'Mondo cringe, man...',
    "Yo that was the cringiest thing I've ever heard...",
    'Your daily serving of cringe, milord...',
    'On a scale of one to cringe, that was pretty cringe...',
    'That was pretty cringe :airplane:',
    'Wow, like....cringe much?',
    'Excuse me, I seem to have dropped my cringe. Do you have it perchance?',
    'Like I always say, that was pretty cringe...',
    'C.R.I.N.G.E'
  ];

  constructor(client: Client, webhookService: WebhookService) {
    super('VennBot', '', client, webhookService);
  }

  canHandle(message: Message): boolean {
    return (
      !message.author.bot &&
      message.author.id === userID.Venn &&
      (!!message.content.match(this.pattern) || random.percentChance(5))
    );
  }

  async processMessage(message: Message): Promise<Result<void, Error>> {
    this.setAvatarUrl(
      message.author.displayAvatarURL() ?? message.author.defaultAvatarURL
    );

    return this.sendReply(message.channel as TextChannel, this.getResponse());
  }

  private getResponse(): string {
    return this.responses[random.roll(this.responses.length)];
  }
}
