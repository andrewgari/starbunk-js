import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';

export default class GundamBot extends ReplyBot {
  private readonly botName = 'GundamBot';
  private readonly avatarUrl =
    'https://a1.cdn.japantravel.com/photo/41317-179698/1440x960!/tokyo-unicorn-gundam-statue-in-odaiba-179698.jpg';
  private readonly pattern = /\bg(u|a)ndam\b/i;
  private readonly response = `That's the famous Unicorn Robot, "Gandum". There, I said it.`;
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
