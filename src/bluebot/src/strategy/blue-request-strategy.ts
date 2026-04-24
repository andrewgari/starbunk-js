import { Message } from 'discord.js';
import { RequestConfirmStrategy } from '@/strategy/blue-request-confirm-strategy';
import { RequestConfirmEnemyStrategy } from '@/strategy/blue-request-confirm-enemy-strategy';
import { logger } from '@/observability/logger';
import { SendAPIMessageStrategy } from '@starbunk/shared/strategy/send-api-message-strategy';

export class BlueRequestStrategy extends SendAPIMessageStrategy {
  readonly name = 'BlueRequestStrategy';
  readonly priority = 30;

  private selectedStrategy: RequestConfirmStrategy;

  constructor(triggeringEvent?: Message) {
    super(triggeringEvent);

    this.selectedStrategy = new RequestConfirmStrategy(this.triggeringEvent);
  }

  async shouldTrigger(): Promise<boolean> {
    const enemyStrategy = new RequestConfirmEnemyStrategy(this.triggeringEvent);
    const isEnemy = await enemyStrategy.shouldTrigger();
    if (isEnemy) {
      this.selectedStrategy = enemyStrategy;
    }

    logger
      .withMetadata({
        strategy_name: this.name,
        is_enemy: isEnemy,
        selected_sub_strategy: this.selectedStrategy.constructor.name,
        author_id: this.triggeringEvent!.author.id,
        message_id: this.triggeringEvent!.id,
      })
      .info(`${this.name}: Routing to ${this.selectedStrategy.constructor.name}`);

    return this.selectedStrategy.shouldTrigger();
  }

  async getResponse(context: Message): Promise<string> {
    if (!this.selectedStrategy) {
      throw new Error(
        'getResponse called without calling shouldTrigger first, or shouldTrigger failed to select a strategy.',
      );
    }

    return this.selectedStrategy.getResponse(context);
  }
}
