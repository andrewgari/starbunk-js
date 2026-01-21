import { Message } from 'discord.js';
import { BlueStrategy } from '@/strategy/blue-strategy';
import { DefaultStrategy } from '@/strategy/blue-default-strategy';
import { ReplyConfirmStrategy } from '@/strategy/blue-reply-confirm-strategy';
import { ConfirmEnemyStrategy } from '@/strategy/blue-reply-confirm-enemy-strategy';

const defaultStrategy = new DefaultStrategy();
const confirmStrategy = new ReplyConfirmStrategy();
const enemyStrategy = new ConfirmEnemyStrategy();

enum StrategyOptions {
	None,
	Default,
	ConfirmFriend,
	ConfirmEnemy,
}

export class BlueReplyStrategy implements BlueStrategy {
	private lastBlueResponse = new Date(0);
	private lastMurderResponse = new Date(0);
	private readonly replyWindow = 5 * 60 * 1000; // 5 minutes in ms
	private readonly murderWindow = 24 * 60 * 60 * 1000; // 24 hours in ms

	private strategy: StrategyOptions = StrategyOptions.None;
	private strat: BlueStrategy | null = null;

  get lastBlueResponseTime(): Date {
    return this.lastBlueResponse;
  }

  get lastMurderResponseTime(): Date {
    return this.lastMurderResponse;
  }

	async shouldRespond(message: Message): Promise<boolean> {
    if (this.isWithinReplyWindow(message)) {
      if (this.shouldMurder(message)) {
        this.strategy = StrategyOptions.ConfirmEnemy;
        this.strat = enemyStrategy;
      } else {
        this.strategy = StrategyOptions.ConfirmFriend;
        this.strat = confirmStrategy;
      }
    } else {
      this.strategy = StrategyOptions.Default;
      this.strat = defaultStrategy;
    }
    if (!this.strategy) throw new Error('Strategy not set');
    if (!this.strat) throw new Error('Strategy not set');

    return Promise.resolve(this.strat?.shouldRespond(message) ?? false);
	}

	async getResponse(message: Message): Promise<string> {
		if (!this.strategy) throw new Error('Strategy not set');
    if (!this.strat) throw new Error('Strategy not set');

    switch (this.strategy) {
      case StrategyOptions.ConfirmEnemy:
        this.clearLastBlueResponse();
        this.updateLastMurderResponse();
        break;
      case StrategyOptions.ConfirmFriend:
        this.clearLastBlueResponse();
        break;
      case StrategyOptions.Default:
        this.updateLastBlueResponse();
        break;
    }

    return Promise.resolve(this.strat.getResponse(message));
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
