import { isDebugMode, logger } from '@starbunk/shared';
import { Message } from 'discord.js';
import { ContextualTriggerCondition, ResponseContext } from './response-context';
import { TriggerCondition } from './trigger-response';

const BOT_IDENTIFIERS = {
	STARBUNK_CLIENT_ID: '836445923105308672',
	COVABOT_WEBHOOK_NAMES: ['CovaBot', 'Cova', 'CovaBot Webhook'],
	COVABOT_USERNAMES: ['CovaBot', 'Cova'],
	BUNKBOT_WEBHOOK_NAMES: ['BunkBot', 'BunkBot Webhook'],
	EXCLUDED_BOT_NAMES: ['CovaBot', 'Cova', 'DJCova', 'Snowbunk'],
	EXCLUDED_BOT_IDS: [] as string[],
};

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
export const matchesPattern = (pattern: RegExp): TriggerCondition =>
	(message: Message) => pattern.test(message.content);

export const contextMatchesPattern = (pattern: RegExp): ContextualTriggerCondition =>
	(context: ResponseContext) => pattern.test(context.content);

export const containsWord = (word: string): TriggerCondition => {
	const wordRegex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
	return (message: Message) => wordRegex.test(message.content);
};

export const contextContainsWord = (word: string): ContextualTriggerCondition =>
	(context: ResponseContext) => context.hasWord(word);

export function containsPhrase(phrase: string): TriggerCondition {
	return (message: Message) =>
		message.content.toLowerCase().includes(phrase.toLowerCase());
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
		const result = random <= chance;
		logger.debug(`withChance(${chance}): random=${Math.round(random)}, result=${result}`);
		return result;
	};
}

export function withinTimeframeOf(
	timestampFn: () => number,
	duration: number | Duration,
	unit: TimeUnit
): TriggerCondition {
	const dur = typeof duration === 'number' ? createDuration(duration) : duration;
	const multipliers = { ms: 1, s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
	const durationMs = dur * multipliers[unit];
	
	return () => {
		const now = Date.now();
		const timestamp = timestampFn();
		return now - timestamp <= durationMs;
	};
}

export function contextWithinTimeframeOf(
	timestampFn: () => number,
	duration: number | Duration,
	unit: TimeUnit
): ContextualTriggerCondition {
	const standardCondition = withinTimeframeOf(timestampFn, duration, unit);
	return () => standardCondition({} as Message);
}

// Bot detection utilities
class BotDetector {
	static isCovaBot(message: Message): boolean {
		if (!message?.author?.bot) return false;

		const username = message.author.username?.toLowerCase() || '';
		const displayName = message.author.displayName?.toLowerCase() || '';

		const isCovaUsername = BOT_IDENTIFIERS.COVABOT_USERNAMES.some(name =>
			username === name.toLowerCase() || displayName === name.toLowerCase()
		);

		const isCovaWebhook = message.webhookId && BOT_IDENTIFIERS.COVABOT_WEBHOOK_NAMES.some(name =>
			username === name.toLowerCase() || displayName === name.toLowerCase()
		);

		const result = isCovaUsername || isCovaWebhook;

		if (isDebugMode()) {
			logger.debug('🤖 CovaBot Detection:', {
				username: message.author.username,
				displayName: message.author.displayName,
				isBot: message.author.bot,
				webhookId: message.webhookId,
				result
			});
		}

		return result;
	}

	static shouldExcludeFromReplyBots(message: Message): boolean {
		if (!message?.author) return true;

		// Exclude BunkBot self-messages
		if (message.client?.user && message.author.id === message.client.user.id) {
			if (isDebugMode()) {
				logger.debug('❌ Excluding BunkBot self-message');
			}
			return true;
		}

		// Exclude specified bots
		const authorName = message.author.username;
		if (BOT_IDENTIFIERS.EXCLUDED_BOT_NAMES.includes(authorName)) {
			if (isDebugMode()) {
				logger.debug(`❌ Excluding message from excluded bot: ${authorName}`);
			}
			return true;
		}

		// Exclude BunkBot webhook messages to prevent loops
		if (message.webhookId && message.author.bot) {
			if (!BOT_IDENTIFIERS.EXCLUDED_BOT_NAMES.includes(authorName)) {
				if (isDebugMode()) {
					logger.debug(`❌ Excluding BunkBot webhook message from: ${authorName}`);
				}
				return true;
			}
		}

		if (isDebugMode()) {
			logger.debug(`✅ Allowing message from: ${message.author.username}`);
		}

		return false;
	}
}

// Export bot detection functions
export const isCovaBot = BotDetector.isCovaBot;
export const shouldExcludeFromReplyBots = BotDetector.shouldExcludeFromReplyBots;

// Bot condition factories
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

export function fromBotExcludingCovaBot(): TriggerCondition {
	return (message: Message): boolean => {
		if (!message?.author?.bot) return false;
		if (shouldExcludeFromReplyBots(message)) return false;
		return true;
	};
}

export function fromCovaBot(): TriggerCondition {
	return (message: Message): boolean => isCovaBot(message);
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
			const result = condition(message);
			const isMatch = result instanceof Promise ? await result : result;
			if (!isMatch) return false;
		}
		return true;
	};
}

export function or(...conditions: TriggerCondition[]): TriggerCondition {
	return async (message: Message) => {
		for (const condition of conditions) {
			try {
				const result = condition(message);
				const isMatch = result instanceof Promise ? await result : result;
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

// Enhanced wrapper with better error handling
export function withDefaultBotBehavior(botName: string, condition: TriggerCondition): TriggerCondition {
	return async (message: Message): Promise<boolean> => {
		try {
			if (message.author.bot && shouldExcludeFromReplyBots(message)) {
				if (isDebugMode()) {
					logger.debug(`[${botName}] 🚫 Message excluded by bot filtering`);
				}
				return false;
			}

			const result = await condition(message);

			if (isDebugMode()) {
				const messageInfo = {
					author: message.author.username,
					isBot: message.author.bot,
					content: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
					result
				};

				logger.debug(`[${botName}] ${result ? '✅' : '❌'} Condition result`, messageInfo);
			}

			return result;
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

function ensureError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}