import { Client, Message, TextChannel } from 'discord.js';

import { ReplyBot } from '../../../discord/bots/replyBot';
import { WebhookService } from '../../../discord/services/webhookService';
import { Result } from '../../../utils/result';

export default class MusicCorrectBot extends ReplyBot {
  private readonly pattern = /^[?!]play /i;

  constructor(client: Client, webhookService: WebhookService) {
    super('BunkBot', '', client, webhookService);
  }

  canHandle(message: Message): boolean {
    return !message.author.bot && !!message.content.match(this.pattern);
  }

  async handle(message: Message): Promise<Result<void, Error>> {
    return this.sendReply(
      message.channel as TextChannel,
      this.getResponse(message.author.id)
    );
  }

  private getResponse(id: string): string {
    return `Hey <@${id}>, Buddy.\nI see you're trying to activate the music bot... I get it, I love to jam it out from time to time. But hey, let me fill you in on a little insider secret.\nYa see, the bot's gone through even **more** *changes* lately (Yeah, Yeah, I know. It keeps on changing how can my tiny brain keep up :unamused:). What *used* to be \`?play\` or \`!play\` has been updated to the shiny new command \`/play\`.\nI know! It's that simple, so if you want to jam it out with your buds or just wanna troll them with some stupid video of a gross man in dirty underpants farting on his roomate's door or .... just the sound of a fart with a little extra revery (I dunno, I'm not judging :shrug:) you can call on me anytime with some youtube link.\n`;
  }
}
