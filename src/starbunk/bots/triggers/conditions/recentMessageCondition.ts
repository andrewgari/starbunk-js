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
   * @param botName - Optional bot name for persistence
   */
	constructor(minutes: number, botName?: string) {
		// Generate a persistence ID if botName is provided
		const persistenceId = botName ? `${botName}_recent_message` : undefined;

		// Convert minutes to milliseconds and set to "within window" mode (min = true)
		this.timeCondition = new TimeDelayCondition(minutes * 60 * 1000, true, persistenceId);
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
   * Also persists the state if a bot name was provided
   */
	updateLastTime(): void {
		this.timeCondition.updateLastTime();
	}

	/**
   * Get the last message timestamp
   * @returns The timestamp of the last message
   */
	getLastMessageTime(): number {
		return this.timeCondition.getLastTime();
	}

	/**
   * Set the last message timestamp manually
   * @param timestamp The timestamp to set
   */
	setLastMessageTime(timestamp: number): void {
		this.timeCondition.setLastTime(timestamp);
	}
}
