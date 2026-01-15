import { Message } from 'discord.js';
import { Strategy } from '@/strategy/strategy';
import { DefaultStrategy } from '@/strategy/default-strategy';
import { ConfirmStrategy } from '@/strategy/confirm-strategy';

const defaultStrategy = new DefaultStrategy();
const confirmStrategy = new ConfirmStrategy();
export class BlueReplyStrategy implements Strategy {
  private lastBlueResponse = new Date();
  private readonly replyWindow = 60000; // 1 minute in ms

  shouldRespond(message: Message): Promise<boolean> {
    const timestamp = new Date(message.createdTimestamp);

    if (timestamp > this.lastBlueResponse) {
      return defaultStrategy.shouldRespond(message);
    }

    return defaultStrategy.shouldRespond(message);
  }

  getResponse(_message: Message): Promise<string> {
    this.lastBlueResponse = new Date();
    return Promise.resolve('Yes');
  }
}
