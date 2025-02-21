import { Message, TextChannel } from 'discord.js';

import ReplyBot from '../replyBot';

export default class SheeshBot extends ReplyBot {
  private botName = 'SheeshBot';
  private readonly avatarUrl = 'https://i.imgflip.com/5fc2iz.png?a471000';

  private readonly defaultPattern = /\bshee+sh\b/i;

  generateRandomEs(): string {
    const numberOfEs = Math.floor(Math.random() * 10);

    return 'e'.repeat(numberOfEs) + 'e' + 'e';
  }

  getBotName(): string {
    return this.botName;
  }
  getAvatarUrl(): string {
    return this.avatarUrl;
  }
  response(): string {
    return 'Sh' + this.generateRandomEs() + 'sh!';
  }

  handleMessage(message: Message<boolean>): void {
    if (message.author.bot) return;

    if (message.content.match(this.defaultPattern)) {
      this.sendReply(message.channel as TextChannel, this.response());
    }
  }
}
