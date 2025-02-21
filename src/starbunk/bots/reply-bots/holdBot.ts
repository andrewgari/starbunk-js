import { Message, TextChannel } from 'discord.js';

import ReplyBot from '../replyBot';

export default class HoldBot extends ReplyBot {
  private readonly botName = 'HoldBot';
  private readonly avatarUrl = 'https://i.imgur.com/YPFGEzM.png';
  private readonly pattern = /^Hold\.?$/i;
  private readonly response = 'Hold.';

  getBotName(): string {
    return this.botName;
  }
  getAvatarUrl(): string {
    return this.avatarUrl;
  }
  handleMessage(message: Message<boolean>): void {
    if (message.author.bot) return;

    if (message.content.match(this.pattern)) {
      this.sendReply(message.channel as TextChannel, this.response);
    }
  }
}
