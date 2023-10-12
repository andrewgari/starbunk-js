import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';
import roleIDs from '../../discord/roleIDs';

export default class SoggyBot extends ReplyBot {
  private readonly botName = 'SoggyBot';
  private readonly avatarUrl = `https://imgur.com/OCB6i4x.jpg`;
  private readonly pattern = /wet bread/i;
  private readonly response = `Sounds like somebody enjoys wet bread`;

  getBotName(): string {
    return this.botName;
  }
  getAvatarUrl(): string {
    return this.avatarUrl;
  }
  handleMessage(message: Message<boolean>): void {
    if (message.author.bot) return;

    if (
      message.content.match(this.pattern) &&
      message.member?.roles.cache.some((role) => role.id === roleIDs.WetBread)
    ) {
      this.sendReply(message.channel as TextChannel, this.response);
    }
  }
}
