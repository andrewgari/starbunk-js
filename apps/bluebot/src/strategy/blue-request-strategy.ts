import { Message } from 'discord.js';
import { Strategy } from '@/strategy/strategy';
import { NiceStrategy } from '@/strategy/nice-strategy';
import { NiceEnemyStrategy } from '@/strategy/nice-enemy-strategy';

const complimentStrategy = new NiceStrategy();
const insultStrategy = new NiceEnemyStrategy();
export class BlueRequestStrategy implements Strategy {
  shouldRespond(message: Message): Promise<boolean> {
    if (message.author.id === process.env.BLUEBOT_ENEMY_USER_ID) {
      return insultStrategy.shouldRespond(message);
    }
    return complimentStrategy.shouldRespond(message);
  }

  getResponse(message: Message): Promise<string> {
    if (message.author.id === process.env.BLUEBOT_ENEMY_USER_ID) {
      // No way, he can suck my blu cane.
      return insultStrategy.getResponse(message);
    }
    // I think you're pretty blue!
    return complimentStrategy.getResponse(message);
  }

}
