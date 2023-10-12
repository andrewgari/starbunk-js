import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';

export default class NiceBot extends ReplyBot {
  private readonly botName = 'BunkBot';
  private readonly avatarUrl = `https://pbs.twimg.com/profile_images/421461637325787136/0rxpHzVx.jpeg`;
  private readonly pattern = /\b69|(sixty-?nine)\b/i;
  private readonly response = 'Nice.';
  getBotName(): string {
    return this.botName;
  }
  getAvatarUrl(): string {
    return this.avatarUrl;
  }
  handleMessage(message: Message<boolean>): void {
    if (message.content.match(this.pattern)) {
      this.sendReply(message.channel as TextChannel, this.response);
    }
  }
}
