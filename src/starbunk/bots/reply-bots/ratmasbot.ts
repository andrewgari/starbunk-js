import { Message, Role, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';
import roleIDs from '../../../discord/roleIDs';

export default class RatmasBot extends ReplyBot {
  private readonly ratmasChannelId = '1178039623834943559';
  private readonly roleMention = `<@&${roleIDs.Ratmas}>`;

  private readonly botName = 'RatmasBot';
  private readonly avatarUrl =
    'https://previews.123rf.com/images/nataliakuzina/nataliakuzina1909/nataliakuzina190900039/132754788-christmas-rat-in-red-santa-claus-hat-looking-at-camera-new-year-card-mouse-symbol-chinese-lunar.jpg';

  getBotName(): string {
    return this.botName;
  }

  getAvatarUrl(): string {
    return this.avatarUrl;
  }

  handleMessage(message: Message<boolean>): void {
    if (message.guild || message.author.bot) return;
    if (message.content.startsWith('Dear Santa Rat,\n')) {
      message.client.channels.fetch(this.ratmasChannelId).then((channel) => {
        console.log(this.roleMention);
        this.sendReply(
          channel as TextChannel,
          `Santa Rat Says: \n\n ${message.content} \n\n ${this.roleMention}`
        );
      });
    }
  }
}
