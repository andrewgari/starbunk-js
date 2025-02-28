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
   * @param persistenceId - Optional identifier for persisting cooldown state
   */
	constructor(minutes: number, persistenceId?: string) {
		// Generate a persistence ID if provided
		const persistKey = persistenceId ? `${persistenceId}_cooldown` : undefined;

		// Convert minutes to milliseconds and set to "cooldown" mode (min = false)
		this.timeCondition = new TimeDelayCondition(minutes * 60 * 1000, false, persistKey);
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

	/**
   * Get the time when the cooldown started
   * @returns The timestamp when the cooldown started
   */
	getCooldownStartTime(): number {
		return this.timeCondition.getLastTime();
	}

	/**
   * Set the cooldown start time manually
   * @param timestamp The timestamp to set
   */
	setCooldownStartTime(timestamp: number): void {
		this.timeCondition.setLastTime(timestamp);
	}
}
