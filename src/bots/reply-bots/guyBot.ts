import { GuildMember, Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';
import random from '../../utils/random';
import userID from '../../discord/userID';

export default class GuyBot extends ReplyBot {
  private botName = 'GuyBot';
  private avatarUrl = '';
  private readonly guyResponses = [
    'What!? What did you say?',
    'Geeeeeet ready for Shriek Week!',
    'Try and keep up mate....',
    'But Who really died that day.\n...and who came back?',
    'Sheeeeeeeeeeeesh',
    "Rats! Rats! Weeeeeeee're the Rats!",
    'The One Piece is REEEEEEEEEEEEEEEEEEAL',
    'Psh, I dunno about that, Chief...',
    'Come to me my noble EINHERJAHR',
    "If you can't beat em, EAT em!",
    'Have you ever been so sick you sluiced your pants?',
    "Welcome back to ... Melon be Smellin'",
    "Chaotic Evil: Don't Respond. :unamused:",
    ':NODDERS: Big Boys... :NODDERS:',
    'Fun Fact: That was actually in XI as well.',
    'Bird Up!',
    'Schlorp',
    'Blimbo'
  ];
  private readonly nonGuyPattern = /guy/i;

  getBotName(): string {
    return this.botName;
  }
  getAvatarUrl(): string {
    return this.avatarUrl;
  }
  getResponse(): string {
    return this.guyResponses[random.roll(this.guyResponses.length)];
  }
  getGuyFromMessage(message: Message): Promise<GuildMember> {
    const guy = message.guild?.members.fetch(userID.Guy);
    if (guy) {
      return Promise.resolve(guy);
    }
    return Promise.reject(new Error('Guy was not found in the server.'));
  }
  handleMessage(message: Message<boolean>): void {
    if (message.author.bot) return;
    console.log('not a bot');
    if (
      message.content.match(this.nonGuyPattern) ||
      (message.author.id === userID.Guy && random.percentChance(10))
    ) {
      console.log('doing a guy');
      this.getGuyFromMessage(message)
        .then((guy) => {
          console.log('this is guy');
          this.botName = guy.nickname ?? guy.displayName;
          this.avatarUrl = guy.avatarURL() ?? guy.displayAvatarURL();
          this.sendReply(message.channel as TextChannel, this.getResponse());
        })
        .catch((error) => {
          console.error(error);
          return;
        });
    }
  }
}
