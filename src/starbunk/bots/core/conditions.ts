import { Message } from 'discord.js';
import { logger } from '../../../services/logger';
import { TriggerCondition } from './trigger-response';

// Core condition type - returns boolean based on message
export type Condition = (message: Message) => boolean | Promise<boolean>;

// Check if message matches regex pattern
export function matchesPattern(pattern: RegExp): TriggerCondition {
	return (message: Message) => pattern.test(message.content);
}

// Check if message is from specific user
export function fromUser(userId: string): TriggerCondition {
	return (message: Message) => message.author.id === userId;
}

// Check based on random chance
export function withChance(percentage: number): TriggerCondition {
	return () => Math.random() * 100 < percentage;
}

// Check if message is from a bot
export const fromBot = (includeSelf = true): Condition => {
	return (message: Message): boolean => {
		if (!message.author.bot) return false;

		// If we don't want to include self, check if it's the client
		if (!includeSelf && message.author.id === message.client.user?.id) {
			return false;
		}

		return true;
	};
};

// Check if event happened within timeframe of a timestamp
export function withinTimeframeOf(
	timestampFn: () => number,
	duration: number,
	unit: 'ms' | 's' | 'm' | 'h'
): TriggerCondition {
	const multipliers = {
		ms: 1,
		s: 1000,
		m: 60 * 1000,
		h: 60 * 60 * 1000
	};
	const durationMs = duration * multipliers[unit];
	return () => {
		const now = Date.now();
		const timestamp = timestampFn();
		return now - timestamp <= durationMs;
	};
}

// Creates a condition using an LLM to analyze message content
// This is just a placeholder - actual implementation would integrate with LLM service
export const llmDetects = (prompt: string): Condition => {
	return async (_message: Message): Promise<boolean> => {
		// Placeholder for LLM integration
		logger.debug(`LLM detection with prompt: ${prompt}`);
		// In real implementation, this would call the LLM service
		return false;
	};
};

export function and(...conditions: TriggerCondition[]): TriggerCondition {
	return async (message: Message) => {
		for (const condition of conditions) {
			if (!(await condition(message))) {
				return false;
			}
		}
		return true;
	};
}

export function or(...conditions: TriggerCondition[]): TriggerCondition {
	return async (message: Message) => {
		for (const condition of conditions) {
			if (await condition(message)) {
				return true;
			}
		}
		return false;
	};
}

export function not(condition: TriggerCondition): TriggerCondition {
	return async (message: Message) => !(await condition(message));
}
