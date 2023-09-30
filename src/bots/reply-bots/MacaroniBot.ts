import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../ReplyBot';
import UserID from 'src/discord/UserID';

export default class MacaroniBot extends ReplyBot {
  private readonly botName = 'MacaroniBot';
  private readonly avatarUrl = 'https://i.imgur.com/fgbH6Xf.jpg';
  private readonly vennPattern = /\bvenn\b/;
  private readonly macaorniPattern = /\bmacaroni\b/;
  private readonly macaroniNamePattern =
    /venn(?!.*Tyrone "The "Macaroni" Man" Johnson" Caelum).*/;
  private readonly vennResponse = `Correction: you mean Venn "Tyrone "The "Macaroni" Man" Johnson" Caelum`;
  private readonly macaroniResponse = `Are you trying to reach <@&%s>`;

  getBotName(): string {
    return this.botName;
  }
  getAvatarUrl(): string {
    return this.avatarUrl;
  }
  handleMessage(message: Message<boolean>): void {
    if (
      message.content.match(this.macaorniPattern) &&
      !message.content.match(this.macaroniNamePattern)
    ) {
      this.sendReply(message.channel as TextChannel, this.vennResponse);
    } else if (message.content.match(this.vennPattern)) {
      this.sendReply(
        message.channel as TextChannel,
        this.macaroniResponse.replace('%s', UserID.Venn)
      );
    }
  }
}
