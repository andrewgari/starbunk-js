import { Message, TextChannel } from 'discord.js';

import ReplyBot from '../replyBot';

export default class EzioBot extends ReplyBot {
  private readonly botName = 'Ezio Auditore Da Firenze';
  private readonly avatarUrl =
    'https://www.creativeuncut.com/gallery-12/art/ac2-ezio5.jpg';
  private readonly pattern = /\bezio|h?assassin.*\b/i;

  getBotName(): string {
    return this.botName;
  }

  getAvatarUrl(): string {
    return this.avatarUrl;
  }

  handleMessage(message: Message<boolean>): void {
    if (message.author.bot) return;

    if (message.content.match(this.pattern)) {
      this.sendReply(
        message.channel as TextChannel,
        `Remember ${message.author.displayName}, Nothing is true; Everything is permitted.`
      );
    }
  }
}
