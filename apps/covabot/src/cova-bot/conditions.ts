// This module intentionally has no imports from shared to keep CovaBot self-contained for now.

import { Message } from 'discord.js';

/**
 * Core condition type - returns boolean based on message
 */
export type TriggerCondition = (message: Message) => boolean | Promise<boolean>;

/**
 * Check if message is from specific user
 */
export function fromUser(userId: string): TriggerCondition {
	return (message: Message) => message.author.id === userId;
}

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
 * Combine multiple conditions with AND logic
 */
export function and(...conditions: TriggerCondition[]): TriggerCondition {
	return async (message: Message) => {
		for (const condition of conditions) {
			const _result = condition(message);
			const isMatch = result instanceof Promise ? await result : result;
			if (!isMatch) {
				return false;
			}
		}
		return true;
	};
}

/**
 * Combine multiple conditions with OR logic
 */
export function or(...conditions: TriggerCondition[]): TriggerCondition {
	return async (message: Message) => {
		for (const condition of conditions) {
			const _result = condition(message);
			const isMatch = result instanceof Promise ? await result : result;
			if (isMatch) {
				return true;
			}
		}
		return false;
	};
}

/**
 * Negate a condition
 */
export function not(condition: TriggerCondition): TriggerCondition {
	return async (message: Message) => {
		const _result = condition(message);
		const isMatch = result instanceof Promise ? await result : result;
		return !isMatch;
	};
}

/**
 * Check if message contains specific text (case insensitive)
 */
export function containsText(text: string): TriggerCondition {
	return (message: Message) => {
		return message.content.toLowerCase().includes(text.toLowerCase());
	};
}

/**
 * Check if message matches regex pattern
 */
export function matchesPattern(pattern: RegExp): TriggerCondition {
	return (message: Message) => {
		return pattern.test(message.content);
	};
}

/**
 * Check if message starts with specific text
 */
export function startsWith(text: string): TriggerCondition {
	return (message: Message) => {
		return message.content.toLowerCase().startsWith(text.toLowerCase());
	};
}

/**
 * Random chance condition (percentage 0-100)
 */
export function withChance(percentage: number): TriggerCondition {
	return () => {
		return Math.random() * 100 < percentage;
	};
}
