import { Message } from 'discord.js';
import { RequestConfirmStrategy } from '@/strategy/blue-request-confirm-strategy';
import { RequestConfirmEnemyStrategy } from '@/strategy/blue-request-confirm-enemy-strategy';
import { logger } from '@/observability/logger';
import { SendAPIMessageStrategy } from '@starbunk/shared/strategy/send-api-message-strategy';

export class BlueRequestStrategy extends SendAPIMessageStrategy {
  readonly name = 'BlueRequestStrategy';
  readonly priority = 30;

  private selectedStrategy: 'insult' | 'compliment' | null = null;

  private _complimentStrategy?: RequestConfirmStrategy;
  private _insultStrategy?: RequestConfirmEnemyStrategy;

  private get complimentStrategy(): RequestConfirmStrategy {
    if (!this._complimentStrategy) {
      this._complimentStrategy = new RequestConfirmStrategy(this.triggeringEvent);
    }
    return this._complimentStrategy;
  }

  private get insultStrategy(): RequestConfirmEnemyStrategy {
    if (!this._insultStrategy) {
      this._insultStrategy = new RequestConfirmEnemyStrategy(this.triggeringEvent);
    }
    return this._insultStrategy;
  }

  async shouldTrigger(): Promise<boolean> {
    const insultResult = await this.insultStrategy.shouldTrigger();
    this.selectedStrategy = insultResult ? 'insult' : 'compliment';

    logger
      .withMetadata({
        strategy_name: 'BlueRequestStrategy',
        sub_strategy: this.selectedStrategy,
        author_id: this.triggeringEvent!.author.id,
        message_id: this.triggeringEvent!.id,
      })
      .debug(`BlueRequestStrategy: Routing to ${this.selectedStrategy} strategy`);

    if (insultResult) {
      logger
        .withMetadata({
          strategy_name: 'BlueRequestStrategy',
          sub_strategy: 'insult',
          result: true,
          message_id: this.triggeringEvent!.id,
        })
        .debug('BlueRequestStrategy: Insult strategy evaluation');
      return true;
    }

    const result = await this.complimentStrategy.shouldTrigger();
    logger
      .withMetadata({
        strategy_name: 'BlueRequestStrategy',
        sub_strategy: 'compliment',
        result,
        message_id: this.triggeringEvent!.id,
      })
      .debug('BlueRequestStrategy: Compliment strategy evaluation');
    return result;
  }

  async getResponse(context: Message): Promise<string> {
    if (!this.selectedStrategy) {
      throw new Error(
        'getResponse called without calling shouldTrigger first, or shouldTrigger failed to select a strategy.',
      );
    }

    logger
      .withMetadata({
        strategy_name: 'BlueRequestStrategy',
        sub_strategy: this.selectedStrategy,
        message_id: this.triggeringEvent!.id,
      })
      .info(`BlueRequestStrategy: Generating ${this.selectedStrategy} response`);

    if (this.selectedStrategy === 'insult') {
      const response = await this.insultStrategy.getResponse(context);
      logger
        .withMetadata({
          strategy_name: 'BlueRequestStrategy',
          sub_strategy: 'insult',
          response_length: response.length,
          message_id: this.triggeringEvent!.id,
        })
        .info('BlueRequestStrategy: Generated insult response for enemy');
      return response;
    }

    const response = await this.complimentStrategy.getResponse(context);
    logger
      .withMetadata({
        strategy_name: 'BlueRequestStrategy',
        sub_strategy: 'compliment',
        response_length: response.length,
        message_id: this.triggeringEvent!.id,
      })
      .info('BlueRequestStrategy: Generated compliment response');
    return response;
  }
}
