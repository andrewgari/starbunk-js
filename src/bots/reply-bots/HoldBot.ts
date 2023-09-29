import { Message, TextChannel } from 'discord.js';
import { ReplyBot } from '../ReplyBot';

export class HoldBot extends ReplyBot {
  private readonly botName = 'HoldBot';
  private readonly avatarUrl = 'https://i.imgur.com/YPFGEzM.png';
  private readonly pattern = /^Hold\.?$/;
  private readonly response = `Hold.`;

  getBotName(): string {
    return this.botName;
  }
  getAvatarUrl(): string {
    return this.avatarUrl;
  }
  handleMessage(message: Message<boolean>): void {
    if (message.content.match(this.pattern)) {
		this.sendReply(message.channel as TextChannel, this.response);
	}
  }
}

const holdbot = (client: Client): ReplyBot => {
	return new HoldBot(client)
}

export default holdbot;
