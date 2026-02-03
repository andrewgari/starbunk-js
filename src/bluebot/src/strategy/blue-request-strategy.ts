import { RequestConfirmStrategy } from '@/strategy/blue-request-confirm-strategy';
import { RequestConfirmEnemyStrategy } from '@/strategy/blue-request-confirm-enemy-strategy';
import { logger } from '@/observability/logger';
import { SendAPIMessageStrategy } from '@starbunk/shared/strategy/send-api-message-strategy';

export class BlueRequestStrategy extends SendAPIMessageStrategy {
  readonly name = 'BlueRequestStrategy';
  readonly priority = 30;

  private readonly complimentStrategy = new RequestConfirmStrategy(this.triggeringEvent);
  private readonly insultStrategy = new RequestConfirmEnemyStrategy(this.triggeringEvent);

  async shouldTrigger(): Promise<boolean> {
    const isEnemy = this.triggeringEvent.author.id === process.env.BLUEBOT_ENEMY_USER_ID;
    const selectedStrategy = isEnemy ? 'insult' : 'compliment';

    logger
      .withMetadata({
        strategy_name: 'BlueRequestStrategy',
        sub_strategy: selectedStrategy,
        is_enemy: isEnemy,
        author_id: this.triggeringEvent.author.id,
        message_id: this.triggeringEvent.id,
      })
      .debug(`BlueRequestStrategy: Routing to ${selectedStrategy} strategy`);

    if (isEnemy) {
      const result = await this.insultStrategy.shouldTrigger();
      logger
        .withMetadata({
          strategy_name: 'BlueRequestStrategy',
          sub_strategy: 'insult',
          result,
          message_id: this.triggeringEvent.id,
        })
        .debug('BlueRequestStrategy: Insult strategy evaluation');
      return result;
    }

    const result = await this.complimentStrategy.shouldTrigger();
    logger
      .withMetadata({
        strategy_name: 'BlueRequestStrategy',
        sub_strategy: 'compliment',
        result,
        message_id: this.triggeringEvent.id,
      })
      .debug('BlueRequestStrategy: Compliment strategy evaluation');
    return result;
  }

  async getResponse(): Promise<string> {
    const isEnemy = this.triggeringEvent.author.id === process.env.BLUEBOT_ENEMY_USER_ID;
    const selectedStrategy = isEnemy ? 'insult' : 'compliment';

    logger
      .withMetadata({
        strategy_name: 'BlueRequestStrategy',
        sub_strategy: selectedStrategy,
        is_enemy: isEnemy,
        message_id: this.triggeringEvent.id,
      })
      .info(`BlueRequestStrategy: Generating ${selectedStrategy} response`);

    if (isEnemy) {
      const response = await this.insultStrategy.getResponse();
      logger
        .withMetadata({
          strategy_name: 'BlueRequestStrategy',
          sub_strategy: 'insult',
          response_length: response.length,
          message_id: this.triggeringEvent.id,
        })
        .info('BlueRequestStrategy: Generated insult response for enemy');
      return response;
    }

    const response = await this.complimentStrategy.getResponse();
    logger
      .withMetadata({
        strategy_name: 'BlueRequestStrategy',
        sub_strategy: 'compliment',
        response_length: response.length,
        message_id: this.triggeringEvent.id,
      })
      .info('BlueRequestStrategy: Generated compliment response');
    return response;
  }
}
