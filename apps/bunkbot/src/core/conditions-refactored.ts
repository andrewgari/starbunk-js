import { isDebugMode, logger, ensureError } from '@starbunk/shared';
import { Message } from 'discord.js';
import { ContextualTriggerCondition, ResponseContext } from './response-context';
import { TriggerCondition } from './trigger-response';

// Removed BOT_IDENTIFIERS - simplified bot detection

export type Condition = (message: Message) => boolean | Promise<boolean>;
export type ConditionTrue = () => true;
export type ConditionFalse = () => false;

type UserId = string;
type ChannelId = string;
type TimeUnit = 'ms' | 's' | 'm' | 'h' | 'd';
type Duration = number;

// Validation utilities
export function createUserId(id: string): UserId {
	if (!id || !/^\d{17,19}$/.test(id)) {
		throw new Error('Invalid user ID format');
	}
	return id;
}

export function createChannelId(id: string): ChannelId {
	if (!id || !/^\d{17,19}$/.test(id)) {
		throw new Error('Invalid channel ID format');
	}
	return id;
}

export function createDuration(value: number): Duration {
	if (value < 0) {
		throw new Error('Duration cannot be negative');
	}
	return value;
}

// Pattern matching conditions
export const matchesPattern =
	(pattern: RegExp): TriggerCondition =>
	(message: Message) =>
		pattern.test(message.content);

export const contextMatchesPattern =
	(pattern: RegExp): ContextualTriggerCondition =>
	(context: ResponseContext) =>
		pattern.test(context.content);

export const containsWord = (word: string): TriggerCondition => {
	const wordRegex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
	return (message: Message) => wordRegex.test(message.content);
};

export const contextContainsWord =
	(word: string): ContextualTriggerCondition =>
	(context: ResponseContext) =>
		context.hasWord(word);

export function containsPhrase(phrase: string): TriggerCondition {
	return (message: Message) => message.content.toLowerCase().includes(phrase.toLowerCase());
}

export function contextContainsPhrase(phrase: string): ContextualTriggerCondition {
	return (context: ResponseContext) => context.hasPhrase(phrase);
}

// User and channel conditions
export function fromUser(userId: string | UserId): TriggerCondition {
	const id = typeof userId === 'string' ? createUserId(userId) : userId;
	return (message: Message) => message.author.id === id;
}

export function inChannel(channelId: string | ChannelId): TriggerCondition {
	const id = typeof channelId === 'string' ? createChannelId(channelId) : channelId;
	return (message: Message) => message.channel.id === id;
}

export function contextInChannel(channelId: string | ChannelId): ContextualTriggerCondition {
	const id = typeof channelId === 'string' ? createChannelId(channelId) : channelId;
	return (context: ResponseContext) => context.channel.id === id;
}

// Probability and time conditions
export function withChance(chance: number): Condition {
	return () => {
		if (isDebugMode()) return true;

		const random = Math.random() * 100;
		const _result = random <= chance;
		logger.debug(`withChance(${chance}): random=${Math.round(random)}, result=${_result}`);
		return _result;
	};
}

export function withinTimeframeOf(
	timestampFn: () => number,
	duration: number | Duration,
	unit: TimeUnit,
): TriggerCondition {
	const dur = typeof duration === 'number' ? createDuration(duration) : duration;
	const multipliers = { ms: 1, s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
	const durationMs = dur * multipliers[unit];

	return () => {
		const _now = Date.now();
		const timestamp = timestampFn();
		return _now - timestamp <= durationMs;
	};
}

export function contextWithinTimeframeOf(
	timestampFn: () => number,
	duration: number | Duration,
	unit: TimeUnit,
): ContextualTriggerCondition {
	const standardCondition = withinTimeframeOf(timestampFn, duration, unit);
	return () => standardCondition({} as Message);
}

// Removed complex bot detection - using simple message.author.bot check only

// Simplified bot condition - just checks message.author.bot
export function fromBot(includeSelf = true): TriggerCondition {
	return (message: Message): boolean => {
		if (!message?.author?.bot) return false;
		if (!includeSelf && message.author.id === message.client.user?.id) {
			return false;
		}
		return true;
	};
}

export function contextFromBot(includeSelf = true): ContextualTriggerCondition {
	return (context: ResponseContext): boolean => {
		if (!context.isFromBot) return false;
		if (!includeSelf && context.author.id === context.message.client.user?.id) {
			return false;
		}
		return true;
	};
}

// LLM conditions
export function llmDetects(prompt: string): TriggerCondition {
	return async (message: Message): Promise<boolean> => {
		try {
			logger.debug(`LLM detection requested for: "${prompt}" on: "${message.content}"`);
			return false; // Disabled until LLM service is integrated
		} catch (error) {
			logger.error(`LLM query failed: ${error instanceof Error ? error.message : String(error)}`);
			return false;
		}
	};
}

export function contextLlmDetects(prompt: string): ContextualTriggerCondition {
	const standardCondition = llmDetects(prompt);
	return async (context: ResponseContext): Promise<boolean> => {
		return standardCondition(context.message);
	};
}

// Logical operators
export function and(...conditions: TriggerCondition[]): TriggerCondition {
	return async (message: Message) => {
		for (const condition of conditions) {
			const _result = condition(message);
			const isMatch = _result instanceof Promise ? await _result : _result;
			if (!isMatch) return false;
		}
		return true;
	};
}

export function or(...conditions: TriggerCondition[]): TriggerCondition {
	return async (message: Message) => {
		for (const condition of conditions) {
			try {
				const _result = condition(message);
				const isMatch = _result instanceof Promise ? await _result : _result;
				if (isMatch) return true;
			} catch (error) {
				logger.debug(`Error in condition: ${error instanceof Error ? error.message : String(error)}`);
			}
		}
		return false;
	};
}

export function not(condition: TriggerCondition): TriggerCondition {
	return async (message: Message) => !(await condition(message));
}

// Simplified wrapper - just checks message.author.bot
export function withDefaultBotBehavior(botName: string, condition: TriggerCondition): TriggerCondition {
	return async (message: Message): Promise<boolean> => {
		try {
			// Simple bot filtering - skip all bot messages
			if (message.author.bot) {
				if (isDebugMode()) {
					logger.debug(`[${botName}] 🚫 Skipping bot message`);
				}
				return false;
			}

			const _result = await condition(message);

			if (isDebugMode()) {
				const messageInfo = {
					author: message.author.username,
					content: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
					result: _result,
				};

				logger.debug(`[${botName}] ${_result ? '✅' : '❌'} Condition result`, messageInfo);
			}

			return _result;
		} catch (error) {
			logger.error(`[${botName}] 💥 Error in condition:`, ensureError(error));
			return false;
		}
	};
}

// Helper functions
function escapeRegExp(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
