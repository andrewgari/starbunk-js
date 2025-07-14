import { Message } from 'discord.js';

/**
 * Core condition type - returns boolean based on message
 */
export type TriggerCondition = (message: Message) => boolean | Promise<boolean>;

/**
 * Check if message is from a bot
 */
export function fromBot(includeSelf = true): TriggerCondition {
	return (message: Message): boolean => {
		if (!message.author.bot) return false;

		// If we don't want to include self, check if it's the client
		if (!includeSelf && message.author.id === message.client.user?.id) {
			return false;
		}

		return true;
	};
}

/**
 * Check if message is from specific user
 */
export function fromUser(userId: string): TriggerCondition {
	return (message: Message) => message.author.id === userId;
}

/**
 * Combine multiple conditions with AND logic
 */
export function and(...conditions: TriggerCondition[]): TriggerCondition {
	return async (message: Message) => {
		for (const condition of conditions) {
			const result = condition(message);
			const isMatch = result instanceof Promise ? await result : result;
			if (!isMatch) {
				return false;
			}
		}
		return true;
	};
}

/**
 * Negate a condition
 */
export function not(condition: TriggerCondition): TriggerCondition {
	return async (message: Message) => {
		const result = condition(message);
		const isMatch = result instanceof Promise ? await result : result;
		return !isMatch;
	};
}
