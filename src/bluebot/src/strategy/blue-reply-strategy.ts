import { Message } from 'discord.js';
import { DefaultStrategy } from '@/strategy/blue-default-strategy';
import { ReplyConfirmStrategy } from '@/strategy/blue-reply-confirm-strategy';
import { ConfirmEnemyStrategy } from '@/strategy/blue-reply-confirm-enemy-strategy';
import { logger } from '@/observability/logger';
import { SendAPIMessageStrategy } from '@starbunk/shared/strategy/send-api-message-strategy';
import { BotStrategy } from '@starbunk/shared';

enum StrategyOptions {
  None,
  Default,
  ConfirmFriend,
  ConfirmEnemy,
}

export class BlueReplyStrategy extends SendAPIMessageStrategy {
  private lastBlueResponse = new Date(0);
  private lastMurderResponse = new Date(0);
  private readonly replyWindow = (() => {
    const parsed = parseInt(process.env.BLUEBOT_REPLY_WINDOW_MS ?? '');
    return Number.isNaN(parsed) ? 5 * 60 * 1000 : parsed;
  })();
  private readonly murderWindow = (() => {
    const parsed = parseInt(process.env.BLUEBOT_MURDER_WINDOW_MS ?? '');
    return Number.isNaN(parsed) ? 24 * 60 * 60 * 1000 : parsed;
  })();

  private lastTriggeringMessage?: Message;

  private strategy: StrategyOptions = StrategyOptions.None;

  get name(): string {
    return 'BlueReplyStrategy';
  }

  get priority(): number {
    return 50;
  }

  async shouldTrigger(message?: Message): Promise<boolean> {
    if (!message) {
      return false;
    }
    return this.shouldRespond(message);
  }

  private selectedStrategy: DefaultStrategy | ReplyConfirmStrategy | ConfirmEnemyStrategy;

  get selectedSubStrategy(): BotStrategy {
    return this.selectedStrategy;
  }

  get lastBlueResponseTime(): Date {
    return this.lastBlueResponse;
  }

  get lastMurderResponseTime(): Date {
    return this.lastMurderResponse;
  }

  constructor(protected readonly triggeringEvent?: Message) {
    super(triggeringEvent);
    this.selectedStrategy = new DefaultStrategy(this.triggeringEvent);
  }

  async shouldRespond(message: Message): Promise<boolean> {
    const now = message.createdAt.getTime();
    const withinReplyWindow = this.isWithinReplyWindow(message);
    const timeSinceLastBlue = now - this.lastBlueResponse.getTime();
    const timeSinceLastMurder = now - this.lastMurderResponse.getTime();

    // Initialize sub-strategies
    const defaultStrategy = new DefaultStrategy(this.triggeringEvent);
    const confirmStrategy = new ReplyConfirmStrategy(this.triggeringEvent);
    const enemyStrategy = new ConfirmEnemyStrategy(this.triggeringEvent);

    const shouldTriggerDefault = await defaultStrategy.shouldTrigger(message);
    const shouldTriggerConfirm = await confirmStrategy.shouldTrigger(message);
    const shouldTriggerEnemy = await enemyStrategy.shouldTrigger(message);

    // Murder only if: enemy says mean word AND we can murder AND within reply window
    const shouldMurder = shouldTriggerEnemy && this.shouldMurder(message) && withinReplyWindow;
    // Confirm if: within reply window AND it's a short message
    const shouldComfirm = withinReplyWindow && shouldTriggerConfirm;

    logger
      .withMetadata({
        strategy_name: this.name,
        message_id: message.id,
        author_id: message.author.id,
        within_reply_window: withinReplyWindow,
        time_since_last_blue_ms: timeSinceLastBlue,
        time_since_last_murder_ms: timeSinceLastMurder,
        reply_window_ms: this.replyWindow,
        murder_window_ms: this.murderWindow,
        should_trigger_default: shouldTriggerDefault,
        should_trigger_confirm: shouldTriggerConfirm,
        should_trigger_enemy: shouldTriggerEnemy,
        should_murder: shouldMurder,
        should_confirm: shouldComfirm,
      })
      .debug(`${this.name}: Sub-strategy evaluation complete`);

    if (shouldMurder) {
      this.selectedStrategy = enemyStrategy;
      this.updateLastMurderResponse();
      this.clearLastBlueResponse(); // Clear the reply window after murder, forcing silence
      logger
        .withMetadata({
          strategy_name: this.name,
          message_id: message.id,
          selected_sub_strategy: 'ConfirmEnemyStrategy',
        })
        .info(`${this.name}: Selected MURDER — enemy triggered within reply window`);
      return true;
    }

    if (shouldComfirm) {
      this.selectedStrategy = confirmStrategy;
      this.clearLastBlueResponse();
      logger
        .withMetadata({
          strategy_name: this.name,
          message_id: message.id,
          selected_sub_strategy: 'ReplyConfirmStrategy',
        })
        .info(`${this.name}: Selected CONFIRM — within reply window with confirmation phrase`);
      return true;
    }

    this.selectedStrategy = defaultStrategy;
    if (shouldTriggerDefault) {
      this.updateLastBlueResponse();
      logger
        .withMetadata({
          strategy_name: this.name,
          message_id: message.id,
          selected_sub_strategy: 'DefaultStrategy',
        })
        .info(`${this.name}: Selected DEFAULT — blue keyword matched`);
    } else {
      logger
        .withMetadata({
          strategy_name: this.name,
          message_id: message.id,
        })
        .debug(`${this.name}: No sub-strategy matched — not responding`);
    }
    return shouldTriggerDefault;
  }

  async getResponse(context: Message): Promise<string> {
    return this.selectedStrategy.getResponse(context);
  }

  private isWithinReplyWindow(message: Message): boolean {
    const timestamp = message.createdAt.getTime();
    const timeSinceLastResponse = timestamp - this.lastBlueResponse.getTime();
    return timeSinceLastResponse < this.replyWindow;
  }

  private isWithinMurderWindow(message: Message): boolean {
    const timestamp = message.createdAt.getTime();
    const timeSinceLastMurder = timestamp - this.lastMurderResponse.getTime();
    return timeSinceLastMurder < this.murderWindow;
  }

  private shouldMurder(message: Message): boolean {
    if (message.author.id === process.env.BLUEBOT_ENEMY_USER_ID) {
      return !this.isWithinMurderWindow(message);
    }
    return false;
  }

  private updateLastBlueResponse() {
    this.lastBlueResponse = new Date();
    logger
      .withMetadata({
        strategy_name: this.name,
        last_blue_response: this.lastBlueResponse.toISOString(),
      })
      .debug(`${this.name}: Reply window opened`);
  }

  private clearLastBlueResponse() {
    this.lastBlueResponse = new Date(0);
    logger.withMetadata({ strategy_name: this.name }).debug(`${this.name}: Reply window cleared`);
  }

  private updateLastMurderResponse() {
    this.lastMurderResponse = new Date();
    logger
      .withMetadata({
        strategy_name: this.name,
        last_murder_response: this.lastMurderResponse.toISOString(),
      })
      .debug(`${this.name}: Murder window opened`);
  }

  private clearLastMurderResponse() {
    this.lastMurderResponse = new Date(0);
    logger.withMetadata({ strategy_name: this.name }).debug(`${this.name}: Murder window cleared`);
  }

  /**
   * Reset the strategy state - useful for testing
   */
  public reset(): void {
    this.clearLastBlueResponse();
    this.clearLastMurderResponse();
  }
}
