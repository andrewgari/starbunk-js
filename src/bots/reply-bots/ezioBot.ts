import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';
import isSelf from '../../utils/isSelf';

export default class EzioBot extends ReplyBot {
  private readonly botName = `Ezio Auditore Da Firenze`;
  private readonly avatarUrl =
    'https://miro.medium.com/max/1838/1*CXPsg1BV8fuPUKchM6Cp-A.png';
  private readonly pattern = /\bezio|h?assassin.*\b/i;

  getBotName(): string {
    return this.botName;
  }

  getAvatarUrl(): string {
    return this.avatarUrl;
  }

  handleMessage(message: Message<boolean>): void {
    if (isSelf(message, this.getBotName())) return;

    if (message.content.match(this.pattern)) {
      console.log('im not an assassin');
      this.sendReply(
        message.channel as TextChannel,
        `Remember ${message.author.displayName}, Nothing is true; Everything is permitted.`
      );
    }
  }
}
