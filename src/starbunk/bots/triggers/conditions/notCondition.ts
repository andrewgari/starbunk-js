import { Message } from 'discord.js';
import { TriggerCondition } from '../../botTypes';

/**
 * Condition that negates the result of another condition
 * Acts as a logical NOT for a condition
 */
export class NotCondition implements TriggerCondition {
	private condition: TriggerCondition;

	/**
	 * Create a new NotCondition that negates the result of the provided condition
	 * @param condition The condition to negate
	 */
	constructor(condition: TriggerCondition) {
		this.condition = condition;
	}

	async shouldTrigger(message: Message): Promise<boolean> {
		// Return the opposite of the condition's result
		return !(await this.condition.shouldTrigger(message));
	}
}
