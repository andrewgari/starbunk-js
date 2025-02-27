import { Message } from 'discord.js';
import { TriggerCondition } from '../../botTypes';

/**
 * Condition that checks if ALL provided conditions are true
 * Acts as a logical AND between multiple conditions
 */
export class AllConditions implements TriggerCondition {
	private conditions: TriggerCondition[];

	/**
	 * Create a new AllConditions that requires all provided conditions to be true
	 * @param conditions The conditions to check
	 */
	constructor(...conditions: TriggerCondition[]) {
		if (conditions.length === 0) {
			throw new Error('AllConditions requires at least one condition');
		}
		this.conditions = conditions;
	}

	async shouldTrigger(message: Message): Promise<boolean> {
		// Return true only if ALL conditions return true
		for (const condition of this.conditions) {
			if (!(await condition.shouldTrigger(message))) {
				return false;
			}
		}
		return true;
	}
}
