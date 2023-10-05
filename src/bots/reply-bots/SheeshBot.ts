import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../ReplyBot';
import UserID from '../../discord/UserID';

export default class SheeshBot extends ReplyBot {
  private botName = 'SheeshBot';
  private readonly avatarUrl = 'https://i.imgflip.com/5fc2iz.png?a471000';

  private readonly defaultPattern = /\bshee+sh\b/;

  generateRandomEs(): string {
  const numberOfEs = Math.floor(Math.random() * 10); // Change 10 to your desired maximum number of 'e's
  return 'e'.repeat(numberOfEs);
}

  getBotName(): string {
    return this.botName;
  }
  getAvatarUrl(): string {
    return this.avatarUrl;
  }
  response(): string {
    return  'Sh' + this.generateRandomEs() + 'sh!'
  }

  handleMessage(message: Message<boolean>): void {
    if (message.content.match(this.defaultPattern))
        this.sendReply(message.channel as TextChannel, this.response());
      }
}