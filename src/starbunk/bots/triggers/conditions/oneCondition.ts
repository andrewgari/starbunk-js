import { Message } from 'discord.js';
import { TriggerCondition } from '../../botTypes';

/**
 * Condition that checks if AT LEAST ONE of the provided conditions is true
 * Acts as a logical OR between multiple conditions
 */
export class OneCondition implements TriggerCondition {
	private conditions: TriggerCondition[];

	/**
	 * Create a new OneCondition that requires at least one of the provided conditions to be true
	 * @param conditions The conditions to check
	 */
	constructor(...conditions: TriggerCondition[]) {
		if (conditions.length === 0) {
			throw new Error('OneCondition requires at least one condition');
		}
		this.conditions = conditions;
	}

	async shouldTrigger(message: Message): Promise<boolean> {
		// Return true if ANY condition returns true
		for (const condition of this.conditions) {
			if (await condition.shouldTrigger(message)) {
				return true;
			}
		}
		return false;
	}
}
