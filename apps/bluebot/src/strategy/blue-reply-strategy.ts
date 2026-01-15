import { Message } from 'discord.js';
import { Strategy } from '@/strategy/strategy';
import { DefaultStrategy } from '@/strategy/default-strategy';
import { ConfirmStrategy } from '@/strategy/confirm-strategy';
import { ConfirmEnemyStrategy } from '@/strategy/confirm-enemy-strategy';

const defaultStrategy = new DefaultStrategy();
const confirmStrategy = new ConfirmStrategy();
const enemyStrategy = new ConfirmEnemyStrategy();

export class BlueReplyStrategy implements Strategy {
  private lastBlueResponse = new Date();
  private lastMurderResponse = new Date();
  private readonly replyWindow = 5 * 60 * 1000; // 5 minutes in ms
  private readonly murderWindow = 24 * 60 * 60 * 1000; // 24 hours in ms

  private isWithinReplyWindow(message: Message): boolean {
    const timestamp = new Date(message.createdTimestamp);
    return timestamp.getTime() < this.lastBlueResponse.getTime() + this.replyWindow;
  }

  private isWithinMurderWindow(message: Message): boolean {
    const timestamp = new Date(message.createdTimestamp);
    return timestamp.getTime() < this.lastMurderResponse.getTime() + this.murderWindow;
  }

  private shouldMurder(message: Message): boolean {
    if (message.author.id !== process.env.BLUEBOT_ENEMY_USER_ID) {
      if (!this.isWithinMurderWindow(message)) {
        return true;
      }
      return false;
    }
    return false;
  }

  async shouldRespond(message: Message): Promise<boolean> {
    if (this.isWithinReplyWindow(message)) {
      if (this.shouldMurder(message)) {
        return enemyStrategy.shouldRespond(message);
      }
      return confirmStrategy.shouldRespond(message);
    }

    return defaultStrategy.shouldRespond(message);
  }

  async getResponse(message: Message): Promise<string> {
    this.lastBlueResponse = new Date();

    if (this.isWithinReplyWindow(message)) {
      if (this.shouldMurder(message)) {
        this.lastMurderResponse = new Date();
        return enemyStrategy.getResponse();
      }
      return confirmStrategy.getResponse();
    }

    return defaultStrategy.getResponse(message);
  }
}
