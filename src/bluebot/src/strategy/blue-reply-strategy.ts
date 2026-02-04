import { Message } from 'discord.js';
import { DefaultStrategy } from '@/strategy/blue-default-strategy';
import { ReplyConfirmStrategy } from '@/strategy/blue-reply-confirm-strategy';
import { ConfirmEnemyStrategy } from '@/strategy/blue-reply-confirm-enemy-strategy';
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
    const withinReplyWindow = this.isWithinReplyWindow(message);

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

    if (shouldMurder) {
      this.selectedStrategy = enemyStrategy;
      this.updateLastMurderResponse();
      this.clearLastBlueResponse(); // Clear the reply window after murder, forcing silence
      return true;
    }

    if (shouldComfirm) {
      this.selectedStrategy = confirmStrategy;
      this.clearLastBlueResponse();
      return true;
    }

    this.selectedStrategy = defaultStrategy;
    this.updateLastBlueResponse();
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
