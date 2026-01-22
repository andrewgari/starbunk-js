import { Message } from 'discord.js';
import { BlueStrategy } from '@/strategy/blue-strategy';
import { RequestConfirmStrategy } from '@/strategy/blue-request-confirm-strategy';
import { RequestConfirmEnemyStrategy } from '@/strategy/blue-request-confirm-enemy-strategy';
import { logger } from '@/observability/logger';

const complimentStrategy = new RequestConfirmStrategy();
const insultStrategy = new RequestConfirmEnemyStrategy();

export class BlueRequestStrategy implements BlueStrategy {
  async shouldRespond(message: Message): Promise<boolean> {
    const isEnemy = message.author.id === process.env.BLUEBOT_ENEMY_USER_ID;
    const selectedStrategy = isEnemy ? 'insult' : 'compliment';

    logger.withMetadata({
      strategy_name: 'BlueRequestStrategy',
      sub_strategy: selectedStrategy,
      is_enemy: isEnemy,
      author_id: message.author.id,
      message_id: message.id,
    }).debug(`BlueRequestStrategy: Routing to ${selectedStrategy} strategy`);

    if (isEnemy) {
      const result = await insultStrategy.shouldRespond(message);
      logger.withMetadata({
        strategy_name: 'BlueRequestStrategy',
        sub_strategy: 'insult',
        result,
        message_id: message.id,
      }).debug('BlueRequestStrategy: Insult strategy evaluation');
      return result;
    }

    const result = await complimentStrategy.shouldRespond(message);
    logger.withMetadata({
      strategy_name: 'BlueRequestStrategy',
      sub_strategy: 'compliment',
      result,
      message_id: message.id,
    }).debug('BlueRequestStrategy: Compliment strategy evaluation');
    return result;
  }

  async getResponse(message: Message): Promise<string> {
    const isEnemy = message.author.id === process.env.BLUEBOT_ENEMY_USER_ID;
    const selectedStrategy = isEnemy ? 'insult' : 'compliment';

    logger.withMetadata({
      strategy_name: 'BlueRequestStrategy',
      sub_strategy: selectedStrategy,
      is_enemy: isEnemy,
      message_id: message.id,
    }).info(`BlueRequestStrategy: Generating ${selectedStrategy} response`);

    if (isEnemy) {
      const response = await insultStrategy.getResponse(message);
      logger.withMetadata({
        strategy_name: 'BlueRequestStrategy',
        sub_strategy: 'insult',
        response_length: response.length,
        message_id: message.id,
      }).info('BlueRequestStrategy: Generated insult response for enemy');
      return response;
    }

    const response = await complimentStrategy.getResponse(message);
    logger.withMetadata({
      strategy_name: 'BlueRequestStrategy',
      sub_strategy: 'compliment',
      response_length: response.length,
      message_id: message.id,
    }).info('BlueRequestStrategy: Generated compliment response');
    return response;
  }

}
