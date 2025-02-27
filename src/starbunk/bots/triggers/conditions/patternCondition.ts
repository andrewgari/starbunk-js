import { Message } from 'discord.js';
import { TriggerCondition } from '../../botTypes';

/**
 * Base class for conditions that check messages against regex patterns
 */
export class PatternCondition implements TriggerCondition {
	protected pattern: RegExp;

	/**
   * Creates a new pattern condition
   *
   * @param pattern - The regex pattern to match against messages
   */
	constructor(pattern: RegExp) {
		this.pattern = pattern;
	}

	/**
   * Checks if the message matches the pattern
   *
   * @param message - The Discord message to check
   * @returns True if the message matches the pattern, false otherwise
   */
	async shouldTrigger(message: Message): Promise<boolean> {
		return this.pattern.test(message.content);
	}
}
