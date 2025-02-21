import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';
import userID from '../../../discord/userID';
import { OpenAIClient } from '../../../openai/openaiClient';

interface BotPatterns {
  default: RegExp;
  confirm: RegExp;
  nice: RegExp;
  mean: RegExp;
}

interface BotAssets {
  avatars: {
    default: string;
    murder: string;
    cheeky: string;
  };
  responses: {
    default: string;
    cheeky: string;
    friendly: (name: string) => string;
    contempt: string;
    murder: string;
  };
}

export default class BlueBot extends ReplyBot {
  private static readonly FIVE_MINUTES_MS = 300000;
  private static readonly ONE_DAY_SEC = 86400;
  private static readonly TWO_MINUTES_SEC = 120;

  private readonly botName = 'BluBot';
  
  private readonly patterns: BotPatterns = {
    default: /\bblue?\b/i,
    confirm: /\b(blue?(bot)?)|(bot)|yes|no|yep|yeah|(i did)|(you got it)|(sure did)\b/i,
    nice: /blue?bot,? say something nice about (?<name>.+$)/i,
    mean: /\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i
  };

  private readonly assets: BotAssets = {
    avatars: {
      default: 'https://imgur.com/WcBRCWn.png',
      murder: 'https://imgur.com/Tpo8Ywd.jpg',
      cheeky: 'https://i.imgur.com/dO4a59n.png'
    },
    responses: {
      default: 'Did somebody say Blu?',
      cheeky: 'Lol, Somebody definitely said Blu! :smile:',
      friendly: (name: string) => `${name}, I think you're pretty Blu! :wink:`,
      contempt: 'No way, Venn can suck my blu cane. :unamused:',
      murder: `What the fuck did you just fucking say about me, you little bitch? I'll have you know I graduated top of my class in the Academia d'Azul, and I've been involved in numerous secret raids on Western La Noscea, and I have over 300 confirmed kills. I've trained with gorillas in warfare and I'm the top bombardier in the entire Eorzean Alliance. You are nothing to me but just another target. I will wipe you the fuck out with precision the likes of which has never been seen before on this Shard, mark my fucking words. You think you can get away with saying that shit to me over the Internet? Think again, fucker. As we speak I am contacting my secret network of tonberries across Eorzea and your IP is being traced right now so you better prepare for the storm, macaroni boy. The storm that wipes out the pathetic little thing you call your life. You're fucking dead, kid. I can be anywhere, anytime, and I can kill you in over seven hundred ways, and that's just with my bear-hands. Not only am I extensively trained in unarmed combat, but I have access to the entire arsenal of the Eorzean Blue Brigade and I will use it to its full extent to wipe your miserable ass off the face of the continent, you little shit. If only you could have known what unholy retribution your little "clever" comment was about to bring down upon you, maybe you would have held your fucking tongue. But you couldn't, you didn't, and now you're paying the price, you goddamn idiot. I will fucking cook you like the little macaroni boy you are. You're fucking dead, kiddo.`
    }
  };

  private currentAvatar = this.assets.avatars.default;
  private lastBlueTimestamp = new Date(Number.MIN_SAFE_INTEGER);
  private lastMurderTimestamp = new Date(Number.MIN_SAFE_INTEGER);

  getBotName(): string {
    return this.botName;
  }

  getAvatarUrl(): string {
    return this.currentAvatar;
  }

  setAvatarUrl(url: string): void {
    this.currentAvatar = url;
  }

  async handleMessage(message: Message): Promise<void> {
    if (message.author.bot) return;

    if (await this.handleNiceRequest(message)) return;
    if (await this.handleVennInsult(message)) return;
    if (await this.handleBlueResponse(message)) return;
    if (await this.handleBlueReference(message)) return;
  }

  private async handleNiceRequest(message: Message): Promise<boolean> {
    if (!message.content.match(this.patterns.nice)) return false;

    const name = this.extractNameFromRequest(message);
    if (name.toLowerCase().includes('venn')) {
      await this.sendContemptResponse(message);
    } else {
      await this.sendFriendlyResponse(message, name);
    }
    return true;
  }

  private async handleVennInsult(message: Message): Promise<boolean> {
    if (!this.isValidVennInsult(message)) return false;

    this.lastMurderTimestamp = new Date();
    this.currentAvatar = this.assets.avatars.murder;
    await this.sendReply(message.channel as TextChannel, this.assets.responses.murder);
    return true;
  }

  private async handleBlueResponse(message: Message): Promise<boolean> {
    if (!this.isRecentBlueResponse(message)) return false;

    this.lastBlueTimestamp = new Date(1);
    this.currentAvatar = this.assets.avatars.cheeky;
    await this.sendReply(message.channel as TextChannel, this.assets.responses.cheeky);
    return true;
  }

  private async handleBlueReference(message: Message): Promise<boolean> {
    const hasDirectReference = message.content.match(this.patterns.default);
    const hasAIDetectedReference = await this.checkIfBlueIsSaid(message);

    if (!hasDirectReference && !hasAIDetectedReference) return false;

    this.lastBlueTimestamp = new Date();
    this.currentAvatar = this.assets.avatars.default;
    await this.sendReply(message.channel as TextChannel, this.assets.responses.default);
    return true;
  }

  private extractNameFromRequest(message: Message): string {
    const matches = message.content.match(this.patterns.nice);
    if (!matches?.groups?.name) return 'Hey';
    
    return matches.groups.name === 'me' 
      ? message.member?.displayName ?? message.author.displayName 
      : matches.groups.name;
  }

  private isValidVennInsult(message: Message): boolean {
    if (message.author.id !== userID.Venn) return false;
    if (!message.content.match(this.patterns.mean)) return false;

    const currentTime = message.createdTimestamp / 1000;
    const timeSinceLastMurder = currentTime - (this.lastMurderTimestamp.getTime() / 1000);
    const timeSinceLastBlue = currentTime - (this.lastBlueTimestamp.getTime() / 1000);

    return timeSinceLastMurder > BlueBot.ONE_DAY_SEC && 
           timeSinceLastBlue < BlueBot.TWO_MINUTES_SEC;
  }

  private isRecentBlueResponse(message: Message): boolean {
    if (!message.content.match(this.patterns.confirm) && 
        !message.content.match(this.patterns.mean)) return false;

    const timeSinceLastBlue = message.createdTimestamp - this.lastBlueTimestamp.getTime();
    return timeSinceLastBlue < BlueBot.FIVE_MINUTES_MS;
  }

  private async sendFriendlyResponse(message: Message, name: string): Promise<void> {
    this.currentAvatar = this.assets.avatars.cheeky;
    await this.sendReply(message.channel as TextChannel, this.assets.responses.friendly(name));
  }

  private async sendContemptResponse(message: Message): Promise<void> {
    this.currentAvatar = this.assets.avatars.default;
    await this.sendReply(message.channel as TextChannel, this.assets.responses.contempt);
  }

  private async checkIfBlueIsSaid(message: Message): Promise<boolean> {
    try {
      const response = await OpenAIClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: this.getBlueDetectionPrompt()
          },
          {
            role: 'user',
            content: `Is the following message referring to the color blue in any form? Message: "${message.content}"`
          }
        ],
        max_tokens: 10,
        temperature: 0.2
      });

      if (!response.choices[0]?.message?.content) {
        console.error('Invalid response from OpenAI');
        return false;
      }

      return response.choices[0].message.content.trim().toLowerCase() === 'yes';
    } catch (error) {
      console.error('OpenAI API error:', error);
      return false;
    }
  }

  private getBlueDetectionPrompt(): string {
    return `You are an assistant that analyzes text to determine if it refers to the color blue, including any misspellings, indirect, or deceptive references. 
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
    - "#0000FF" -> yes`;
  }
}
