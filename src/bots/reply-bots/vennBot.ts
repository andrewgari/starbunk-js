import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';
import random from '../..//utils/random';
import userID from '../../discord/userID';

export default class VennBot extends ReplyBot {
  private botName = 'VennBot';
  private avatarUrl = '';
  private readonly pattern = /\bcringe\b/;
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
  getResponse(): string {
    return this.responses[random.roll(this.responses.length)];
  }
  getBotName(): string {
    return this.botName;
  }
  getAvatarUrl(): string {
    return this.avatarUrl;
  }
  handleMessage(message: Message<boolean>): void {
    if (
      message.author.id == userID.Venn &&
      (message.content.match(this.pattern) || random.percentChance(20))
    ) {
      this.sendReply(message.channel as TextChannel, this.getResponse());
    }
  }
}
