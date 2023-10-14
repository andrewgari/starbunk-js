import { Message, TextChannel } from 'discord.js';
import ReplyBot from '../replyBot';
import userID from '../../../discord/userID';

export default class BlueBot extends ReplyBot {
  private botName: string = 'BluBot';

  private readonly defaultPattern =
    /\b(blue?|bloo|b lue?|eulb|azul|cerulean|azure|vivena|not red)(bot)?\b/i;
  private readonly confirmPattern =
    /\b(blue?(bot)?)|(bot)|yes|no|yep|yeah|(i did)|(you got it)|(sure did)\b/i;
  private readonly nicePattern =
    /blue?bot,? say something nice about (?<name>.+$)/i;
  private readonly meanPattern =
    /\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i;

  private readonly defaultAvatarURL = 'https://imgur.com/WcBRCWn.png';
  private readonly murderAvatar = 'https://imgur.com/Tpo8Ywd.jpg';
  private readonly cheekyAvatar = 'https://i.imgur.com/dO4a59n.png';
  private avatarUrl = this.defaultAvatarURL;

  private readonly defaultResponse = 'Did somebody say Blu?';
  private readonly cheekyResponse =
    'Lol, Somebody definitely said Blu! :smile:';
  private readonly friendlyResponse = (name: string) =>
    `${name}, I think you're pretty Blu! :wink:`;
  private readonly contemptResponse =
    'No way, Venn can suck my blu cane. :unamused:';
  private readonly murderResponse =
    "What the fuck did you just fucking say about me, you little bitch? I'll have you know I graduated top of my class in the Academia d'Azul, and I've been involved in numerous secret raids on Western La Noscea, and I have over 300 confirmed kills. I've trained with gorillas in warfare and I'm the top bombardier in the entire Eorzean Alliance. You are nothing to me but just another target. I will wipe you the fuck out with precision the likes of which has never been seen before on this Shard, mark my fucking words. You think you can get away with saying that shit to me over the Internet? Think again, fucker. As we speak I am contacting my secret network of tonberries across Eorzea and your IP is being traced right now so you better prepare for the storm, macaroni boy. The storm that wipes out the pathetic little thing you call your life. You're fucking dead, kid. I can be anywhere, anytime, and I can kill you in over seven hundred ways, and that's just with my bear-hands. Not only am I extensively trained in unarmed combat, but I have access to the entire arsenal of the Eorzean Blue Brigade and I will use it to its full extent to wipe your miserable ass off the face of the continent, you little shit. If only you could have known what unholy retribution your little \"clever\" comment was about to bring down upon you, maybe you would have held your fucking tongue. But you couldn't, you didn't, and now you're paying the price, you goddamn idiot. I will fucking cook you like the little macaroni boy you are. You're fucking dead, kiddo.";

  private blueTimestamp: Date = new Date();
  private blueMurderTimestamp: Date = new Date();

  getBotName(): string {
    return this.botName;
  }

  setBotName(name: string): void {
    this.botName = name;
  }

  getAvatarUrl(): string {
    return this.avatarUrl;
  }

  setAvatarUrl(url: string): void {
    this.avatarUrl = url;
  }

  handleMessage(message: Message<boolean>): void {
    if (message.author.bot) return;
    
    if (message.content.match(this.nicePattern)) {
      const name = this.getNameFromBluRequest(message);
      if (name.match(/venn/i)) {
        this.avatarUrl = this.defaultAvatarURL;
        this.sendReply(message.channel as TextChannel, this.contemptResponse);
      } else {
        this.avatarUrl = this.cheekyAvatar;
        this.sendReply(
          message.channel as TextChannel,
          this.friendlyResponse(name)
        );
      }
      return;
    } else if (this.isVennInsultingBlu(message)) {
      this.blueMurderTimestamp = new Date();
      this.avatarUrl = this.murderAvatar;
      this.sendReply(message.channel as TextChannel, this.murderResponse);
      return;
    } else if (this.isSomeoneRespondingToBlu(message)) {
      this.blueTimestamp = new Date(1);
      this.avatarUrl = this.cheekyAvatar;
      this.sendReply(message.channel as TextChannel, this.cheekyResponse);
      return;
    } else if (message.content.match(this.defaultPattern)) {
      this.blueTimestamp = new Date();
      this.avatarUrl = this.defaultAvatarURL;
      this.sendReply(message.channel as TextChannel, this.defaultResponse);
      return;
    }
  }

  private isSomeoneRespondingToBlu(message: Message): boolean {
    if (
      !message.content.match(this.confirmPattern) &&
      !message.content.match(this.meanPattern)
    ) {
      return false;
    }
    const lastMessage = this.blueTimestamp.getTime();
    // if the last blue message was less than five minutes ago
    if (message.createdTimestamp - lastMessage < 300000) {
      return true;
    }
    return false;
  }

  private isVennInsultingBlu(message: Message): boolean {
    if (message.author.id !== userID.Venn) return false;
    if (!message.content.match(this.meanPattern)) return false;
    const lastMurder = this.blueMurderTimestamp.getTime() / 1000;
    const current = new Date(message.createdTimestamp).getTime() / 1000;
    // if the last murder message was at least 24 hours ago
    if (current - lastMurder > 86400) {
      return true;
    }
    return false;
  }

  private getNameFromBluRequest(message: Message): string {
    const matches = message.content.match(this.nicePattern);
    if (!matches || matches.length < 2) return 'Hey,';
    const pronoun = matches[1];
    if (pronoun === 'me') {
      return message.member?.displayName ?? message.author.displayName;
    }
    return matches[1];
  }
}
