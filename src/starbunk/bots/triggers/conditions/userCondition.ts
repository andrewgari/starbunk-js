import { Message } from 'discord.js';
import { TriggerCondition } from '../../botTypes';

/**
 * Condition that checks if the message author is a specific user
 */
export class UserCondition implements TriggerCondition {
	/**
	 * Creates a new user condition
	 *
	 * @param userId - The Discord user ID to check for
	 */
	constructor(private userId: string) {
		if (!userId) {
			throw new Error('UserCondition requires a valid userId');
		}
	}

	/**
	 * Determines if the condition should trigger based on whether the message author matches the specified user ID
	 *
	 * @param message - The Discord message to check
	 * @returns True if the message author matches the specified user ID, false otherwise
	 */
	async shouldTrigger(message: Message): Promise<boolean> {
		return message.author.id === this.userId;
	}
}
