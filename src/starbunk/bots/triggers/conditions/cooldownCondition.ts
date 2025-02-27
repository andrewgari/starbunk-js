import { TriggerCondition } from '../../botTypes';
import { TimeDelayCondition } from './timeDelayCondition';

/**
 * Condition that implements a cooldown period between triggers
 * Uses the TimeDelayCondition internally set to "cooldown" mode
 */
export class CooldownCondition implements TriggerCondition {
	private timeCondition: TimeDelayCondition;

	/**
   * Creates a condition that checks if enough time has passed since the last trigger
   *
   * @param minutes - The number of minutes that must pass before triggering again
   */
	constructor(minutes: number) {
		// Convert minutes to milliseconds and set to "cooldown" mode (min = false)
		this.timeCondition = new TimeDelayCondition(minutes * 60 * 1000, false);
	}

	/**
   * Checks if enough time has passed since the last trigger
   *
   * @returns True if cooldown period has passed, false otherwise
   */
	async shouldTrigger(): Promise<boolean> {
		return this.timeCondition.shouldTrigger();
	}

	/**
   * Update the last trigger time to the current time
   */
	updateLastTime(): void {
		this.timeCondition.updateLastTime();
	}
}
