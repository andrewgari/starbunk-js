import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';
import UserID from '../../../discord/userID';
import random from '../../../utils/random';

export default class BananaBot extends ReplyBot {
  private botName = 'BananaBot';
  private avatarUrl = '';

  private readonly bananasponses = [
    `Always bring a :banana: to a party, banana's are good!`,
    `Don't drop the :banana:, they're a good source of potassium!`,
    `If you gave a monkey control over it's environment, it would fill the world with :banana:s...`,
    `Banana. :banana:`,
    `Don't judge a :banana: by it's skin.`,
    `Life is full of :banana: skins.`,
    `OOOOOOOOOOOOOOOOOOOOOH BA NA NA :banana:`,
    `:banana: Slamma!`,
    `A :banana: per day keeps the Macaroni away...`,
    `const bestFruit = ('b' + 'a' + + 'a').toLowerCase(); :banana:`,
    `Did you know that the :banana:s we have today aren't even the same species of :banana:s we had 50 years ago. The fruit has gone extinct over time and it's actually a giant eugenics experimet to produce new species of :banana:...`,
    `Monkeys always ask ''Wher :banana:', but none of them ask 'How :banana:?'`,
    ':banana: https://www.tiktok.com/@tracey_dintino_charles/video/7197753358143278378?_r=1&_t=8bFpt5cfIbG'
  ];

  getBotName(): string {
    return this.botName;
  }

  getAvatarUrl(): string {
    return this.avatarUrl;
  }

  response(): string {
    const index = Math.floor(Math.random() * this.bananasponses.length);
    return this.bananasponses[index];
  }

  handleMessage(message: Message<boolean>): void {
    if (message.author.bot) return;

    if (message.author.id === UserID.Venn) {
      if (random.percentChance(5)) {
        this.botName = message.author.displayName ?? message.author.username;
        this.avatarUrl =
          message.author.displayAvatarURL() ?? message.author.avatarURL;
        this.sendReply(message.channel as TextChannel, this.response());
      }
    }
  }
}
