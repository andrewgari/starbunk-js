import { TriggerCondition } from "../../botTypes";

/**
 * Condition that checks if a time delay has passed
 *
 * Can be used to check if something happened within a time window (min)
 * or if enough time has passed since the last occurrence (max)
 */
export class TimeDelayCondition implements TriggerCondition {
	private lastTime: number = 0;

	/**
   * Create a time delay condition
   *
   * @param delay - The time delay in milliseconds
   * @param min - If true, checks if time since last trigger is less than delay (within window)
   *            If false, checks if time since last trigger is greater than delay (cooldown)
   */
	constructor(private delay: number, private min: boolean = true) { }

	/**
   * Determines if enough time has passed or if we're within a time window
   *
   * @returns True if the condition should trigger based on timing, false otherwise
   */
	async shouldTrigger(): Promise<boolean> {
		const currentTime = Date.now();
		const timeSinceLast = currentTime - this.lastTime;

		// If min is true, we want to check if we're within the window
		// If min is false, we want to check if enough time has passed
		const result = this.min
			? timeSinceLast < this.delay  // Within time window
			: timeSinceLast > this.delay; // Cooldown has passed

		return result;
	}

	/**
   * Update the last trigger time to the current time
   */
	updateLastTime(): void {
		this.lastTime = Date.now();
	}
}
