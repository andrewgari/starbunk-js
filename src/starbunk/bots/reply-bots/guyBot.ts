import { Client, GuildMember, Message, TextChannel } from 'discord.js';

import { ReplyBot } from '../../../discord/bots/replyBot';
import { WebhookService } from '../../../discord/services/webhookService';
import userID from '../../../discord/userID';
import random from '../../../utils/random';
import { Failure, Result } from '../../../utils/result';

export default class GuyBot extends ReplyBot {
  private readonly responses = [
    'What!? What did you say?',
    'Geeeeeet ready for Shriek Week!',
    'Try and keep up mate....',
    'But Who really died that day.\n...and who came back?',
    'Sheeeeeeeeeeeesh',
    'Rats! Rats! Weeeeeeee\'re the Rats!',
    'The One Piece is REEEEEEEEEEEEEEEEEEAL',
    'Psh, I dunno about that, Chief...',
    'Come to me my noble EINHERJAHR',
    'If you can\'t beat em, EAT em!',
    'Have you ever been so sick you sluiced your pants?',
    'Welcome back to ... Melon be Smellin\'',
    'Chaotic Evil: Don\'t Respond. :unamused:',
    ':NODDERS: Big Boys... :NODDERS:',
    'Fun Fact: That was actually in XI as well.',
    'Bird Up!',
    'Schlorp',
    'I wouldn\'t dream of disturbing something so hideously erogenous',
    'Good Year, Good Year',
    'True Grit',
    'MisterMisterMisterMisterMisterMisterMisterMisterMisterMisterMisterBeeeeeeeeeeeeeeeeeeeeeeeeeeast',
    'It\'s a message you can say',
    'Blimbo'
  ];
  private readonly pattern = /gremlin/i;

  constructor(client: Client, webhookService: WebhookService) {
    super('GuyBot', '', client, webhookService);
  }

  canHandle(message: Message): boolean {
    return (
      !message.author.bot &&
      (!!message.content.match(this.pattern) ||
        (message.author.id === userID.Guy && random.percentChance(5)))
    );
  }

  async handle(message: Message): Promise<Result<void, Error>> {
    try {
      const guy = await this.getGuyFromMessage(message);
      this.setAvatarUrl(guy.avatarURL() ?? guy.displayAvatarURL());

      return this.sendReply(message.channel as TextChannel, this.getResponse());
    }
    catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error('Failed to handle message')
      );
    }
  }

  private getResponse(): string {
    return this.responses[Math.floor(Math.random() * this.responses.length)];
  }

  private async getGuyFromMessage(message: Message): Promise<GuildMember> {
    const guy = await message.guild?.members.fetch(userID.Guy);
    if (guy) return guy;
    throw new Error('Guy was not found in the server.');
  }
}
