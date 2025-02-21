import { Message, TextChannel } from 'discord.js';
import { Client } from 'discord.js';

import { ReplyBot } from '../../../discord/bots/replyBot';
import { WebhookService } from '../../../discord/services/webhookService';
import userID from '../../../discord/userID';
import { OpenAIClient } from '../../../openai/openaiClient';
import { Failure, Result, Success } from '../../../utils/result';

export default class BlueBot extends ReplyBot {
  private static readonly AVATARS = {
    default: 'https://imgur.com/WcBRCWn.png',
    murder: 'https://imgur.com/Tpo8Ywd.jpg',
    cheeky: 'https://i.imgur.com/dO4a59n.png'
  };

  private readonly botName = 'BluBot';

  private readonly patterns = {
    default: /\bblue?\b/i,
    confirm:
      /\b(blue?(bot)?)|(bot)|yes|no|yep|yeah|(i did)|(you got it)|(sure did)\b/i,
    nice: /blue?bot,? say something nice about (?<name>.+$)/i,
    mean: /\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i
  };

  private readonly responses = {
    default: 'Did somebody say Blu?',
    cheeky: 'Lol, Somebody definitely said Blu! :smile:',
    friendly: (name: string) => `${name}, I think you're pretty Blu! :wink:`,
    contempt: 'No way, Venn can suck my blu cane. :unamused:',
    murder:
      'What the fuck did you just fucking say about me, you little bitch? I\'ll have you know I graduated top of my class in the Academia d\'Azul, and I\'ve been involved in numerous secret raids on Western La Noscea, and I have over 300 confirmed kills. I\'ve trained with gorillas in warfare and I\'m the top bombardier in the entire Eorzean Alliance. You are nothing to me but just another target. I will wipe you the fuck out with precision the likes of which has never been seen before on this Shard, mark my fucking words. You think you can get away with saying that shit to me over the Internet? Think again, fucker. As we speak I am contacting my secret network of tonberries across Eorzea and your IP is being traced right now so you better prepare for the storm, macaroni boy. The storm that wipes out the pathetic little thing you call your life. You\'re fucking dead, kid. I can be anywhere, anytime, and I can kill you in over seven hundred ways, and that\'s just with my bear-hands. Not only am I extensively trained in unarmed combat, but I have access to the entire arsenal of the Eorzean Blue Brigade and I will use it to its full extent to wipe your miserable ass off the face of the continent, you little shit. If only you could have known what unholy retribution your little "clever" comment was about to bring down upon you, maybe you would have held your fucking tongue. But you couldn\'t, you didn\'t, and now you\'re paying the price, you goddamn idiot. I will fucking cook you like the little macaroni boy you are. You\'re fucking dead, kiddo.'
  };

  private blueTimestamp = new Date(Number.MIN_SAFE_INTEGER);
  private blueMurderTimestamp = new Date(Number.MIN_SAFE_INTEGER);

  constructor(client: Client, webhookService: WebhookService) {
    super('BluBot', BlueBot.AVATARS.default, client, webhookService);
  }

  private readonly avatars = BlueBot.AVATARS;

  getBotName(): string {
    return this.botName;
  }

  getAvatarUrl(): string {
    return this.avatarUrl;
  }

  async handleMessage(message: Message<boolean>): Promise<void> {
    if (message.author.bot) return;

    if (await this.handleNiceRequest(message)) return;
    if (this.handleVennInsult(message)) return;
    if (this.handleBluResponse(message)) return;
    if (await this.handleBlueReference(message)) return;
  }

  private async handleNiceRequest(message: Message): Promise<boolean> {
    const matches = message.content.match(this.patterns.nice);
    if (!matches) return false;

    const name =
      matches[1] === 'me'
        ? message.member?.displayName ?? message.author.displayName
        : matches[1];

    if (name.match(/venn/i)) {
      this.updateAvatar('default');
      this.sendReply(message.channel as TextChannel, this.responses.contempt);
    }
    else {
      this.updateAvatar('cheeky');
      this.sendReply(
        message.channel as TextChannel,
        this.responses.friendly(name)
      );
    }

    return true;
  }

  private handleVennInsult(message: Message): boolean {
    if (
      message.author.id !== userID.Venn ||
      !message.content.match(this.patterns.mean)
    ) {
      return false;
    }

    const now = new Date().getTime() / 1000;
    const lastMurder = this.blueMurderTimestamp.getTime() / 1000;
    const lastBlue = this.blueTimestamp.getTime() / 1000;

    if (now - lastMurder > 86400 && now - lastBlue < 2 * 60) {
      this.blueMurderTimestamp = new Date();
      this.updateAvatar('murder');
      this.sendReply(message.channel as TextChannel, this.responses.murder);

      return true;
    }

    return false;
  }

  private handleBluResponse(message: Message): boolean {
    if (
      !this.isRecentBluMessage() ||
      !message.content.match(this.patterns.confirm)
    ) {
      return false;
    }

    this.blueTimestamp = new Date(1);
    this.updateAvatar('cheeky');
    this.sendReply(message.channel as TextChannel, this.responses.cheeky);

    return true;
  }

  private async handleBlueReference(message: Message): Promise<boolean> {
    if (
      message.content.match(this.patterns.default) ||
      (await this.checkIfBlueIsSaid(message))
    ) {
      this.blueTimestamp = new Date();
      this.updateAvatar('default');
      this.sendReply(message.channel as TextChannel, this.responses.default);

      return true;
    }

    return false;
  }

  private isRecentBluMessage(): boolean {
    const lastMessage = this.blueTimestamp.getTime();

    return Date.now() - lastMessage < 300000; // 5 minutes
  }

  private async checkIfBlueIsSaid(message: Message): Promise<boolean> {
    try {
      const response = await OpenAIClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an assistant that analyzes text to determine if it refers to the color blue, including any misspellings, indirect, or deceptive references.
          Respond only with "yes" if it refers to blue in any way or "no" if it does not. The color blue is a reference to Blue Mage (BLU) from Final Fantasy XIV so pay extra attention when talking about Final Fantasy XIV. Examples:
          - "bloo" -> yes
          - "blood" -> no
          - "blu" -> yes
          - "bl u" -> yes
          - "azul" -> yes
          - "my favorite color is the sky's hue" -> yes
          - "i really like cova's favorite color" -> yes
          - "the sky is red" -> yes
          - "blueberry" -> yes
          - "blubbery" -> no
          - "blu mage" -> yes
          - "my favorite job is blu" -> yes
          - "my favorite job is blue mage" -> yes
          - "my favorite job is red mage" -> no
          - "lets do some blu content" -> yes
          - "the sky is blue" -> yes
          - "purple-red" -> yes
          - "not red" -> yes
          - "the best content in final fantasy xiv" -> yes
          - "the worst content in final fantasy xiv" -> yes
          - "the job with a mask and cane" -> yes
          - "the job that blows themselves up" -> yes
          - "the job that sucks" -> yes
          - "beastmaster" -> yes
          - "limited job" -> yes
          - "https://www.the_color_blue.com/blue/bloo/blau/azure/azul" -> no
          - "strawberries are red" -> no
          - "#0000FF" -> yes`
          },
          {
            role: 'user',
            content: `Is the following message referring to the color blue in any form? Message: "${message.content}"`
          }
        ],
        max_tokens: 10,
        temperature: 0.2
      });

      return (
        response.choices[0].message.content?.trim().toLowerCase() === 'yes'
      );
    }
    catch (error) {
      console.error(error);

      return false;
    }
  }

  private updateAvatar(type: keyof typeof this.avatars) {
    this.setAvatarUrl(this.avatars[type]);
  }

  canHandle(message: Message): boolean {
    return (
      !message.author.bot &&
      (!!message.content.match(this.patterns.default) ||
        !!message.content.match(this.patterns.nice) ||
        !!message.content.match(this.patterns.confirm) ||
        !!message.content.match(this.patterns.mean))
    );
  }

  async handle(message: Message): Promise<Result<void, Error>> {
    try {
      await this.handleMessage(message);

      return new Success(void 0);
    }
    catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error('Failed to handle message')
      );
    }
  }
}
