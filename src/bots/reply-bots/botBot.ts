import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';
import Random from '../../utils/random';
import isSelf from '../../utils/isSelf';

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
    if (!isSelf(message, this.getBotName()) && Random.percentChance(10)) {
      this.sendReply(message.channel as TextChannel, this.response);
    }
  }
}
