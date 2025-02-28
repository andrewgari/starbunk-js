/**
 * Example Conditions Module
 *
 * This module exports condition classes used in the example bots.
 * These are simplified versions of the actual conditions used in the project.
 */

import { Message } from 'discord.js';
import { TriggerCondition } from '../../src/starbunk/bots/botTypes';

/**
 * RegexCondition - Checks if a message matches a regex pattern
 */
export class RegexCondition implements TriggerCondition {
	private pattern: RegExp;

	constructor(pattern: RegExp) {
		this.pattern = pattern;
	}

	async shouldTrigger(message: Message): Promise<boolean> {
		return this.pattern.test(message.content);
	}
}

/**
 * AndCondition - Checks if all conditions are met
 */
export class AndCondition implements TriggerCondition {
	private conditions: TriggerCondition[];

	constructor(conditions: TriggerCondition[]) {
		this.conditions = conditions;
	}

	async shouldTrigger(message: Message): Promise<boolean> {
		for (const condition of this.conditions) {
			if (!(await condition.shouldTrigger(message))) {
				return false;
			}
		}
		return true;
	}
}
