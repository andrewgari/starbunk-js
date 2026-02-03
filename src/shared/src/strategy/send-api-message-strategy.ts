import { Message, TextChannel } from 'discord.js';
import { BotStrategy } from './bot-strategy';
import { logger } from '../observability/logger';

export abstract class SendAPIMessageStrategy extends BotStrategy<Message, boolean> {
  abstract readonly name: string;
  abstract readonly priority: number;

  async execute(target: TextChannel | Message): Promise<boolean> {
    if (target instanceof TextChannel) {
      try {
        await target.send(await this.getResponse());
        return true;
      } catch (error) {
        logger
          .withError(error)
          .withMetadata({ strategy_name: this.name })
          .error('Error sending message to text channel');
        return false;
      }
    }
    if (target instanceof Message) {
      try {
        if (target.channel instanceof TextChannel) {
          await target.channel.send(await this.getResponse());
        } else {
          logger
            .withMetadata({ strategy_name: this.name, channel_id: target.channel.id })
            .error('Message channel is not a text channel');
          return false;
        }
        return true;
      } catch (error) {
        logger
          .withError(error)
          .withMetadata({ strategy_name: this.name, message_id: target.id })
          .error('Error sending message via message channel');
        return false;
      }
    }
    return false;
  }

  abstract getResponse(): Promise<string>;
}
