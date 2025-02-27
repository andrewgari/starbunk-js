import { Message } from 'discord.js';
import { TriggerCondition } from '../../botTypes';

/**
 * Condition that checks if a message is from a specific user
 */
export class UserMessageCondition implements TriggerCondition {
	/**
   * Creates a condition that checks if a message is from a specific user
   *
   * @param userId - The Discord user ID to check against
   */
	constructor(private userId: string) { }

	/**
   * Checks if the message author matches the specified user ID
   *
   * @param message - The Discord message to check
   * @returns True if the message is from the specified user, false otherwise
   */
	async shouldTrigger(message: Message): Promise<boolean> {
		return message.author.id === this.userId;
	}
}
