import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';
import isSelf from '../../utils/isSelf';
import roleIDs from '../../discord/roleIDs';

export default class MacaroniBot extends ReplyBot {
  private readonly botName = 'MacaroniBot';
  private readonly avatarUrl = 'https://i.imgur.com/fgbH6Xf.jpg';
  private readonly vennPattern = /\bvenn\b/i;
  private readonly macaorniPattern = /\bmacaroni\b/i;
  private readonly macaroniNamePattern =
    /venn(?!.*Tyrone "The "Macaroni" Man" Johnson" Caelum).*/;
  private readonly vennResponse = `Correction: you mean Venn "Tyrone "The "Macaroni" Man" Johnson" Caelum`;
  private readonly macaroniResponse = (id: string) =>
    `Are you trying to reach <@&${id}>`;

  getBotName(): string {
    return this.botName;
  }
  getAvatarUrl(): string {
    return this.avatarUrl;
  }
  handleMessage(message: Message<boolean>): void {
    if (message.author.bot || isSelf(message, this.getBotName())) return;

    if (
      message.content.match(this.macaorniPattern) &&
      !message.content.match(this.macaroniNamePattern)
    ) {
      this.sendReply(message.channel as TextChannel, this.vennResponse);
    } else if (message.content.match(this.vennPattern)) {
      this.sendReply(
        message.channel as TextChannel,
        this.macaroniResponse(roleIDs.Macaroni)
      );
    }
  }
}
