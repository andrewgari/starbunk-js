import { Message, TextChannel } from 'discord.js';
import { BotStrategy } from './bot-strategy';

export abstract class SendAPIMessageStrategy extends BotStrategy<Message, boolean> {
  abstract readonly name: string;
  abstract readonly priority: number;

  async execute(target: TextChannel | Message): Promise<boolean> {
    if (target instanceof TextChannel) {
      try {
        await target.send(await this.getResponse());
        return true;
      } catch (error) {
        console.error(`[${this.name}] Error sending message to text channel:`, error);
        return false;
      }
    }
    if (target instanceof Message) {
      try {
        if (target.channel instanceof TextChannel) {
          await target.channel.send(await this.getResponse());
        } else {
          console.error(`[${this.name}] Message channel is not a text channel:`, target.channel.id);
          return false;
        }
        return true;
      } catch (error) {
        console.error(`[${this.name}] Error sending message via message channel:`, error);
        return false;
      }
    }
    return false;
  }

  abstract getResponse(): Promise<string>;
}
