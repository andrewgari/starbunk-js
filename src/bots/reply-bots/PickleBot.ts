import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../ReplyBot';
import UserID from '../../discord/UserID';
import Random from '../../utils/Random';

export default class PickleBot extends ReplyBot {
  private readonly botname = 'GremlinBot';
  private readonly avatarUrl = 'https://i.imgur.com/D0czJFu.jpg';
  private readonly response = `Could you repeat that? I don't speak *gremlin*`;
  private readonly pattern = /gremlin/;

  getBotName(): string {
    return this.botname;
  }

  getAvatarUrl(): string {
    return this.avatarUrl;
  }

  handleMessage(message: Message<boolean>): void {
    if (
      message.content.match(this.pattern) ||
      (message.author.id === UserID.Sig && Random.percentChance(15))
    ) {
      this.sendReply(message.channel as TextChannel, this.response);
    }
  }
}
