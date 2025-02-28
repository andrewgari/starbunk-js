import { botStateService } from '../../../../services/botStateService';
import { Logger } from '../../../../services/logger';
import { TriggerCondition } from "../../botTypes";

/**
 * Condition that checks if a time delay has passed
 *
 * Can be used to check if something happened within a time window (min)
 * or if enough time has passed since the last occurrence (max)
 */
export class TimeDelayCondition implements TriggerCondition {
	private lastTime: number = 0;
	private persistenceKey: string | null = null;

	/**
   * Create a time delay condition
   *
   * @param delay - The time delay in milliseconds
   * @param min - If true, checks if time since last trigger is less than delay (within window)
   *            If false, checks if time since last trigger is greater than delay (cooldown)
   * @param persistenceId - Optional ID for persisting this condition's state between restarts
   */
	constructor(
		private delay: number,
		private min: boolean = true,
		persistenceId?: string
	) {
		// If persistenceId is provided, set up persistence
		if (persistenceId) {
			this.persistenceKey = `time_condition_${persistenceId}`;
			this.loadPersistedState();
		}
	}

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
		this.persistState();
	}

	/**
   * Set the last trigger time to a specific timestamp
   * @param timestamp The timestamp to set
   */
	setLastTime(timestamp: number): void {
		this.lastTime = timestamp;
		this.persistState();
	}

	/**
   * Get the last trigger time
   * @returns The last trigger time as a timestamp
   */
	getLastTime(): number {
		return this.lastTime;
	}

	/**
   * Save the state to the persistence service
   */
	private persistState(): void {
		if (!this.persistenceKey) return;

		try {
			botStateService.setState(this.persistenceKey, this.lastTime);
		} catch (error) {
			Logger.debug(`Failed to persist time condition state: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
   * Load the state from the persistence service
   */
	private loadPersistedState(): void {
		if (!this.persistenceKey) return;

		try {
			const persistedTime = botStateService.getState<number>(this.persistenceKey, 0);
			if (persistedTime > 0) {
				this.lastTime = persistedTime;
				Logger.debug(`Loaded persisted time for ${this.persistenceKey}: ${new Date(this.lastTime).toISOString()}`);
			}
		} catch (error) {
			Logger.debug(`Failed to load persisted time condition state: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}
