import { Message } from 'discord.js';
import { TriggerCondition } from '../botTypes';
import { isBot, isVenn } from './userConditions';

/**
 * Trigger for Venn insults with rate limiting (once per day)
 */
export class VennInsultTrigger implements TriggerCondition {
	private pattern = /\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i;
	private lastTriggeredTime = 0;
	private oneDayInMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

	async shouldTrigger(message: Message): Promise<boolean> {
		if (isBot(message)) return false;

		// Check if the message author is Venn
		if (!isVenn(message)) return false;

		// Check if it's been at least 24 hours since last trigger
		const currentTime = Date.now();
		const canTriggerAgain = currentTime - this.lastTriggeredTime > this.oneDayInMs;

		if (this.pattern.test(message.content) && canTriggerAgain) {
			this.lastTriggeredTime = currentTime;
			return true;
		}

		return false;
	}
}

/**
 * Composite trigger that combines multiple triggers with OR logic
 */
export class CompositeTrigger implements TriggerCondition {
	constructor(private triggers: TriggerCondition[]) { }

	async shouldTrigger(message: Message): Promise<boolean> {
		for (const trigger of this.triggers) {
			if (await trigger.shouldTrigger(message)) {
				return true;
			}
		}
		return false;
	}
}

/**
 * Composite trigger that combines multiple triggers with AND logic
 */
export class AllConditionsTrigger implements TriggerCondition {
	constructor(private triggers: TriggerCondition[]) { }

	async shouldTrigger(message: Message): Promise<boolean> {
		for (const trigger of this.triggers) {
			if (!(await trigger.shouldTrigger(message))) {
				return false;
			}
		}
		return true;
	}
}

/**
 * Trigger that negates another trigger
 */
export class NotTrigger implements TriggerCondition {
	constructor(private trigger: TriggerCondition) { }

	async shouldTrigger(message: Message): Promise<boolean> {
		return !(await this.trigger.shouldTrigger(message));
	}
}
