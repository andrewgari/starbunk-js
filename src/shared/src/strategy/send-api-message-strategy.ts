import { Message, TextChannel } from 'discord.js';
import { BotStrategy } from './bot-strategy';

export abstract class SendAPIMessageStrategy extends BotStrategy<Message, boolean> {
  abstract readonly name: string;
  abstract readonly priority: number;
  abstract getResponse(context: Message): Promise<string>;

  async execute(message: Message): Promise<boolean> {
    try {
      if (message.channel instanceof TextChannel) {
        await message.channel.send(await this.getResponse(message));
        return true;
      } else {
        console.error(
          `[${this.name}] Message channel is not a text channel: ${message.channel.id}`,
        );
        return false;
      }
    } catch (error) {
      console.error(`[${this.name}] Error sending message directly: ${error}`);
      return false;
    }
  }
}
