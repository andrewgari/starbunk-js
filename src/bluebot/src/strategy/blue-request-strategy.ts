import { Message } from 'discord.js';
import { BlueStrategy } from '@/strategy/blue-strategy';
import { NiceStrategy } from '@/strategy/blue-request-nice-strategy';
import { RequestEnemyStrategy } from '@/strategy/blue-request-murder-strategy';

const complimentStrategy = new NiceStrategy();
const insultStrategy = new RequestEnemyStrategy();

export class BlueRequestStrategy implements BlueStrategy {
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
