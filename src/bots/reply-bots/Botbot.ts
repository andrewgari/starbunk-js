import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../ReplyBot';
import Random from '../../utils/Random';

export default class Botbot extends ReplyBot {
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
    if (Random.percentChance(10) && message.author.bot && message.author.username !== this.getBotName()) {
      this.sendReply(message.channel as TextChannel, this.response);
    }
  }
}
