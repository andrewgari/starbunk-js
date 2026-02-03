import { Message } from 'discord.js';
import { DefaultStrategy } from '@/strategy/blue-default-strategy';
import { ReplyConfirmStrategy } from '@/strategy/blue-reply-confirm-strategy';
import { ConfirmEnemyStrategy } from '@/strategy/blue-reply-confirm-enemy-strategy';
import { logger } from '@/observability/logger';
import { SendAPIMessageStrategy } from '@starbunk/shared/strategy/send-api-message-strategy';

enum StrategyOptions {
  None,
  Default,
  ConfirmFriend,
  ConfirmEnemy,
}

export class BlueReplyStrategy extends SendAPIMessageStrategy {
  private lastBlueResponse = new Date(0);
  private lastMurderResponse = new Date(0);
  private readonly replyWindow = 5 * 60 * 1000; // 5 minutes in ms
  private readonly murderWindow = 24 * 60 * 60 * 1000; // 24 hours in ms

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

  private readonly defaultStrategy: DefaultStrategy = new DefaultStrategy(this.triggeringEvent);
  private readonly confirmStrategy: ReplyConfirmStrategy = new ReplyConfirmStrategy(
    this.triggeringEvent,
  );
  private readonly enemyStrategy: ConfirmEnemyStrategy = new ConfirmEnemyStrategy(
    this.triggeringEvent,
  );

  private strat: DefaultStrategy | ReplyConfirmStrategy | ConfirmEnemyStrategy | null = null;

  get lastBlueResponseTime(): Date {
    return this.lastBlueResponse;
  }

  get lastMurderResponseTime(): Date {
    return this.lastMurderResponse;
  }

  async shouldRespond(message: Message): Promise<boolean> {
    this.lastTriggeringMessage = message;
    const timestamp = message.createdAt.getTime();
    const timeSinceLastBlue = timestamp - this.lastBlueResponse.getTime();
    const timeSinceLastMurder = timestamp - this.lastMurderResponse.getTime();
    const withinReplyWindow = this.isWithinReplyWindow(message);
    const withinMurderWindow = this.isWithinMurderWindow(message);
    const isEnemy = message.author.id === process.env.BLUEBOT_ENEMY_USER_ID;
    const shouldMurder = this.shouldMurder(message);

    // Log detailed timekeeper state
    logger
      .withMetadata({
        strategy_name: 'BlueReplyStrategy',
        message_id: message.id,
        author_id: message.author.id,
        author_username: message.author.username,
        is_enemy: isEnemy,
        // Timekeeper state
        last_blue_response: this.lastBlueResponse.toISOString(),
        last_murder_response: this.lastMurderResponse.toISOString(),
        time_since_last_blue_ms: timeSinceLastBlue,
        time_since_last_blue_minutes: (timeSinceLastBlue / (60 * 1000)).toFixed(2),
        time_since_last_murder_ms: timeSinceLastMurder,
        time_since_last_murder_hours: (timeSinceLastMurder / (60 * 60 * 1000)).toFixed(2),
        reply_window_ms: this.replyWindow,
        reply_window_minutes: this.replyWindow / (60 * 1000),
        murder_window_ms: this.murderWindow,
        murder_window_hours: this.murderWindow / (60 * 60 * 1000),
        within_reply_window: withinReplyWindow,
        within_murder_window: withinMurderWindow,
        should_murder: shouldMurder,
      })
      .debug('BlueReplyStrategy: Evaluating timekeeper state');

    // Determine which sub-strategy to use based on timekeeper logic
    if (withinReplyWindow) {
      if (shouldMurder) {
        this.strategy = StrategyOptions.ConfirmEnemy;
        this.strat = this.enemyStrategy;
        logger
          .withMetadata({
            strategy_name: 'BlueReplyStrategy',
            sub_strategy: 'ConfirmEnemy',
            reason: 'within_reply_window_and_should_murder',
            message_id: message.id,
            is_enemy: isEnemy,
            within_murder_window: withinMurderWindow,
          })
          .info('BlueReplyStrategy: Selected ConfirmEnemy strategy (murder mode)');
      } else {
        this.strategy = StrategyOptions.ConfirmFriend;
        this.strat = this.confirmStrategy;
        logger
          .withMetadata({
            strategy_name: 'BlueReplyStrategy',
            sub_strategy: 'ConfirmFriend',
            reason: 'within_reply_window_not_murder',
            message_id: message.id,
            is_enemy: isEnemy,
          })
          .info('BlueReplyStrategy: Selected ConfirmFriend strategy');
      }
    } else {
      this.strategy = StrategyOptions.Default;
      this.strat = this.defaultStrategy;
      logger
        .withMetadata({
          strategy_name: 'BlueReplyStrategy',
          sub_strategy: 'Default',
          reason: 'outside_reply_window',
          message_id: message.id,
          time_since_last_blue_minutes: (timeSinceLastBlue / (60 * 1000)).toFixed(2),
        })
        .info('BlueReplyStrategy: Selected Default strategy');
    }

    if (!this.strategy) throw new Error('Strategy not set');
    if (!this.strat) throw new Error('Strategy not set');

    const subStrategyResult = await this.strat.shouldTrigger(message);

    logger
      .withMetadata({
        strategy_name: 'BlueReplyStrategy',
        sub_strategy: StrategyOptions[this.strategy],
        sub_strategy_result: subStrategyResult,
        message_id: message.id,
      })
      .debug(`BlueReplyStrategy: Sub-strategy evaluation result`);

    return Promise.resolve(subStrategyResult);
  }

  async getResponse(): Promise<string> {
    if (!this.strategy) throw new Error('Strategy not set');
    if (!this.strat) throw new Error('Strategy not set');

    const event = this.lastTriggeringMessage ?? this.triggeringEvent;
    if (!event) {
      throw new Error('No triggering message available for response generation');
    }

    const strategyName = StrategyOptions[this.strategy];
    const beforeState = {
      last_blue_response: this.lastBlueResponse.toISOString(),
      last_murder_response: this.lastMurderResponse.toISOString(),
    };

    logger
      .withMetadata({
        strategy_name: 'BlueReplyStrategy',
        sub_strategy: strategyName,
        message_id: event.id,
        timekeeper_state_before: beforeState,
      })
      .debug('BlueReplyStrategy: Generating response and updating timekeeper');

    // Update timekeeper state based on strategy
    switch (this.strategy) {
      case StrategyOptions.ConfirmEnemy:
        this.clearLastBlueResponse();
        this.updateLastMurderResponse();
        logger
          .withMetadata({
            strategy_name: 'BlueReplyStrategy',
            sub_strategy: strategyName,
            action: 'clear_blue_update_murder',
            new_murder_response_time: this.lastMurderResponse.toISOString(),
            message_id: event.id,
          })
          .info('BlueReplyStrategy: Updated timekeeper - cleared blue, set murder timestamp');
        break;
      case StrategyOptions.ConfirmFriend:
        this.clearLastBlueResponse();
        logger
          .withMetadata({
            strategy_name: 'BlueReplyStrategy',
            sub_strategy: strategyName,
            action: 'clear_blue',
            message_id: event.id,
          })
          .info('BlueReplyStrategy: Updated timekeeper - cleared blue timestamp');
        break;
      case StrategyOptions.Default:
        this.updateLastBlueResponse();
        logger
          .withMetadata({
            strategy_name: 'BlueReplyStrategy',
            sub_strategy: strategyName,
            action: 'update_blue',
            new_blue_response_time: this.lastBlueResponse.toISOString(),
            message_id: event.id,
          })
          .info('BlueReplyStrategy: Updated timekeeper - set blue timestamp');
        break;
    }

    const response = await this.strat.getResponse(event);

    logger
      .withMetadata({
        strategy_name: 'BlueReplyStrategy',
        sub_strategy: strategyName,
        response_length: response.length,
        response_preview: response.substring(0, 100),
        message_id: event.id,
        timekeeper_state_after: {
          last_blue_response: this.lastBlueResponse.toISOString(),
          last_murder_response: this.lastMurderResponse.toISOString(),
        },
      })
      .info(`BlueReplyStrategy: Response generated via ${strategyName}`);

    return Promise.resolve(response);
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
  }

  private clearLastBlueResponse() {
    this.lastBlueResponse = new Date(0);
  }

  private updateLastMurderResponse() {
    this.lastMurderResponse = new Date();
  }

  private clearLastMurderResponse() {
    this.lastMurderResponse = new Date(0);
  }

  /**
   * Reset the strategy state - useful for testing
   */
  public reset(): void {
    this.clearLastBlueResponse();
    this.clearLastMurderResponse();
  }
}
