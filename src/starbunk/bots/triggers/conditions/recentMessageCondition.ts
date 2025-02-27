import { TriggerCondition } from '../../botTypes';
import { TimeDelayCondition } from './timeDelayCondition';

/**
 * Condition that checks if the bot sent a message recently
 * Uses the TimeDelayCondition internally set to "within window" mode
 */
export class RecentMessageCondition implements TriggerCondition {
	private timeCondition: TimeDelayCondition;

	/**
   * Creates a condition that checks if a message was sent in the last N minutes
   *
   * @param minutes - The number of minutes to consider as "recent"
   */
	constructor(minutes: number) {
		// Convert minutes to milliseconds and set to "within window" mode (min = true)
		this.timeCondition = new TimeDelayCondition(minutes * 60 * 1000, true);
	}

	/**
   * Checks if the last trigger time was within the specified window
   *
   * @returns True if a message was sent recently, false otherwise
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
