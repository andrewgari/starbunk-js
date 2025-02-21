import { Message, TextChannel } from 'discord.js';

import ReplyBot from '../replyBot';

export default class BabyBot extends ReplyBot {
  private readonly botName = 'CheckBot';
  private readonly avatarUrl = 'https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg';
  private readonly pattern = /\bczech\b/i;
  private readonly response = 'I believe you mean \'check\'.';

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
