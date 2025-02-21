import { Message, TextChannel } from 'discord.js';

import Random from '../../../utils/random';
import ReplyBot from '../replyBot';

export default class BotBot extends ReplyBot {
  private readonly defaultAvatarURL =
    'https://cdn-icons-png.flaticon.com/512/4944/4944377.png';
  private readonly defaultName = 'Botbot';
  private readonly response = 'Hello fellow bot!';

  getBotName(): string {
    return this.defaultName;
  }
  getAvatarUrl(): string {
    return this.defaultAvatarURL;
  }
  handleMessage(message: Message<boolean>): void {
    if (this.isSelf(message)) return;

    if (message.author.bot && Random.percentChance(10)) {
      this.sendReply(message.channel as TextChannel, this.response);
    }
  }
}
