import { isDebugMode, logger } from '@starbunk/shared';
import { Message } from 'discord.js';

// Simple user IDs for testing and development
const userIds = {
	Cova: '139592376443338752', // Cova's actual Discord user ID
	Venn: '123456789012345678', // Valid format placeholder for Venn
	Chad: '123456789012345679' // Valid format placeholder for Chad
};

// Bot identification constants
const BOT_IDENTIFIERS = {
	// Discord application/client ID used by all containers
	STARBUNK_CLIENT_ID: '836445923105308672',

	// CovaBot-specific identifiers (AI personality bot)
	COVABOT_WEBHOOK_NAMES: ['CovaBot', 'Cova', 'CovaBot Webhook'],
	COVABOT_USERNAMES: ['CovaBot', 'Cova'],

	// BunkBot-specific identifiers (reply bots)
	BUNKBOT_WEBHOOK_NAMES: ['BunkBot', 'BunkBot Webhook'],

	// Other bot identifiers to exclude
	EXCLUDED_BOT_NAMES: ['CovaBot', 'Cova', 'DJCova', 'Snowbunk'],
	EXCLUDED_BOT_IDS: [] as string[] // Can be populated with specific bot user IDs
};
import { ContextualTriggerCondition, ResponseContext } from './response-context';
import { TriggerCondition } from './trigger-response';
/**
 * Core condition type - returns boolean based on message
 */
export type Condition = (message: Message) => boolean | Promise<boolean>;

export type ConditionTrue = () => true;
export type ConditionFalse = () => false;

/**
 * Strongly typed user ID
 */
type UserId = string;

export function createUserId(id: string): UserId {
	if (!id || !/^\d{17,19}$/.test(id)) {
		throw new Error('Invalid user ID format');
	}
	return id;
}

/**
 * Strongly typed channel ID
 */
type ChannelId = string;

export function createChannelId(id: string): ChannelId {
	if (!id || !/^\d{17,19}$/.test(id)) {
		throw new Error('Invalid channel ID format');
	}
	return id;
}



/**
 * Time units for duration-based conditions
 */
type TimeUnit = 'ms' | 's' | 'm' | 'h' | 'd';

/**
 * Duration for time-based conditions
 */
type Duration = number;

export function createDuration(value: number): Duration {
	if (value < 0) {
		throw new Error('Duration cannot be negative');
	}
	return value;
}

// Check if message matches regex pattern
export const matchesPattern = (pattern: RegExp): TriggerCondition =>
	(message: Message) => pattern.test(message.content);

// Contextual version of matchesPattern
export const contextMatchesPattern = (pattern: RegExp): ContextualTriggerCondition =>
	(context: ResponseContext) => pattern.test(context.content);

// Check if message contains a specific word (not substring)
export const containsWord = (word: string): TriggerCondition => {
	const wordRegex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
	return (message: Message) => wordRegex.test(message.content);
};

// Contextual version of containsWord
export const contextContainsWord = (word: string): ContextualTriggerCondition =>
	(context: ResponseContext) => context.hasWord(word);

// Check if message contains a phrase (substring)
export function containsPhrase(phrase: string): TriggerCondition {
	return (message: Message) =>
		message.content.toLowerCase().includes(phrase.toLowerCase());
}

// Contextual version of containsPhrase
export function contextContainsPhrase(phrase: string): ContextualTriggerCondition {
	return (context: ResponseContext) => context.hasPhrase(phrase);
}

// Check if message is from specific user
export function fromUser(userId: string | UserId): TriggerCondition {
	if (isDebugMode()) {
		return () => userId === userIds.Cova;
	}
	const id = typeof userId === 'string' ? createUserId(userId) : userId;
	return (message: Message) => message.author.id === id;
}

// Check if message is in a specific channel
export function inChannel(channelId: string | ChannelId): TriggerCondition {
	const id = typeof channelId === 'string' ? createChannelId(channelId) : channelId;
	return (message: Message) => message.channel.id === id;
}

// Contextual version of inChannel
export function contextInChannel(channelId: string | ChannelId): ContextualTriggerCondition {
	const id = typeof channelId === 'string' ? createChannelId(channelId) : channelId;
	return (context: ResponseContext) => context.channel.id === id;
}

// Check based on random chance
export function withChance(chance: number): Condition {
	return () => {
		if (isDebugMode()) {
			return true;
		}

		const random = Math.random() * 100;
		const result = random <= chance;
		logger.debug(`withChance(${chance}): random=${random}, result=${result}`);
		return result;
	};
}

// Check if message is from a bot
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
 * Enhanced bot detection that identifies specific bot types
 * This is more robust than the generic fromBot() function
 */
export function isCovaBot(message: Message): boolean {
	// Check if message is from a bot first
	if (!message.author.bot) return false;

	// Check username patterns
	const username = message.author.username.toLowerCase();
	const displayName = message.author.displayName?.toLowerCase() || '';

	// Check for CovaBot-specific identifiers
	const isCovaUsername = BOT_IDENTIFIERS.COVABOT_USERNAMES.some(name =>
		username.includes(name.toLowerCase()) || displayName.includes(name.toLowerCase())
	);

	// Check webhook names if available (for webhook-sent messages)
	const isCovaWebhook = message.webhookId ? BOT_IDENTIFIERS.COVABOT_WEBHOOK_NAMES.some(name =>
		username.includes(name.toLowerCase()) || displayName.includes(name.toLowerCase())
	) : false;

	const result = isCovaUsername || isCovaWebhook;

	if (isDebugMode()) {
		logger.debug(`🤖 CovaBot Detection:`, {
			username: message.author.username,
			displayName: message.author.displayName,
			isBot: message.author.bot,
			webhookId: message.webhookId,
			isCovaUsername,
			isCovaWebhook,
			result
		});
	}

	return result;
}

/**
 * Check if message should be excluded from reply bot processing
 * This implements the comprehensive bot filtering logic
 */
export function shouldExcludeFromReplyBots(message: Message): boolean {
	// Always exclude non-bot messages from this check
	if (!message.author.bot) return false;

	// Check if it's CovaBot specifically
	if (isCovaBot(message)) {
		if (isDebugMode()) {
			logger.debug(`❌ Excluding CovaBot message from reply bot processing`);
		}
		return true;
	}

	// Check if it's from the same client (self)
	if (message.client.user && message.author.id === message.client.user.id) {
		if (isDebugMode()) {
			logger.debug(`❌ Excluding self-message from reply bot processing`);
		}
		return true;
	}

	// Check excluded bot names
	const username = message.author.username.toLowerCase();
	const displayName = message.author.displayName?.toLowerCase() || '';

	const isExcludedName = BOT_IDENTIFIERS.EXCLUDED_BOT_NAMES.some(name =>
		username.includes(name.toLowerCase()) || displayName.includes(name.toLowerCase())
	);

	if (isExcludedName) {
		if (isDebugMode()) {
			logger.debug(`❌ Excluding bot message from excluded name list: ${message.author.username}`);
		}
		return true;
	}

	// Check excluded bot IDs
	if (BOT_IDENTIFIERS.EXCLUDED_BOT_IDS.includes(message.author.id)) {
		if (isDebugMode()) {
			logger.debug(`❌ Excluding bot message from excluded ID list: ${message.author.id}`);
		}
		return true;
	}

	// If we get here, the bot message is allowed
	if (isDebugMode()) {
		logger.debug(`✅ Bot message allowed for reply bot processing: ${message.author.username}`);
	}

	return false;
}

// Contextual version of fromBot
export function contextFromBot(includeSelf = true): ContextualTriggerCondition {
	return (context: ResponseContext): boolean => {
		if (!context.isFromBot) return false;

		// If we don't want to include self, check if it's the client
		if (!includeSelf && context.author.id === context.message.client.user?.id) {
			return false;
		}

		return true;
	};
}

/**
 * Enhanced bot condition that excludes CovaBot and other specified bots
 * This should be used instead of fromBot() for reply bots that need to interact with bots
 * but should exclude CovaBot specifically
 */
export function fromBotExcludingCovaBot(): TriggerCondition {
	return (message: Message): boolean => {
		// Must be from a bot
		if (!message.author.bot) return false;

		// But exclude CovaBot and other excluded bots
		if (shouldExcludeFromReplyBots(message)) return false;

		// Allow other bot messages
		return true;
	};
}

/**
 * Condition that only matches CovaBot messages (for debugging/testing)
 */
export function fromCovaBot(): TriggerCondition {
	return (message: Message): boolean => {
		return isCovaBot(message);
	};
}

// Check if event happened within timeframe of a timestamp
export function withinTimeframeOf(
	timestampFn: () => number,
	duration: number | Duration,
	unit: TimeUnit
): TriggerCondition {
	const dur = typeof duration === 'number' ? createDuration(duration) : duration;
	const multipliers = {
		ms: 1,
		s: 1000,
		m: 60 * 1000,
		h: 60 * 60 * 1000,
		d: 24 * 60 * 60 * 1000
	};
	const durationMs = dur * multipliers[unit];
	return () => {
		const now = Date.now();
		const timestamp = timestampFn();
		const result = now - timestamp <= durationMs;
		return result;
	};
}

// Contextual version of withinTimeframeOf
export function contextWithinTimeframeOf(
	timestampFn: () => number,
	duration: number | Duration,
	unit: TimeUnit
): ContextualTriggerCondition {
	const dur = typeof duration === 'number' ? createDuration(duration) : duration;
	const multipliers = {
		ms: 1,
		s: 1000,
		m: 60 * 1000,
		h: 60 * 60 * 1000,
		d: 24 * 60 * 60 * 1000
	};
	const durationMs = dur * multipliers[unit];
	return () => {
		const now = Date.now();
		const timestamp = timestampFn();
		return now - timestamp <= durationMs;
	};
}

// Creates a condition using an LLM to analyze message content
export function llmDetects(prompt: string): TriggerCondition {
	return async (message: Message): Promise<boolean> => {
		try {
			// TODO: Implement LLM service integration
			logger.debug(`LLM detection requested for prompt: "${prompt}" on message: "${message.content}"`);

			// For now, return false to disable LLM-based conditions
			// This will be implemented when LLM service is properly integrated
			return false;

		} catch (error) {
			logger.error(`LLM query failed in llmDetects: ${error instanceof Error ? error.message : String(error)}`);
			return false;
		}
	};
}

// Contextual version of llmDetects
export function contextLlmDetects(prompt: string): ContextualTriggerCondition {
	const standardCondition = llmDetects(prompt);
	return async (context: ResponseContext): Promise<boolean> => {
		return standardCondition(context.message);
	};
}

// Combine multiple conditions with AND logic
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

// Combine multiple conditions with OR logic
export function or(...conditions: TriggerCondition[]): TriggerCondition {
	return async (message: Message) => {
		for (const condition of conditions) {
			try {
				const result = condition(message);
				const isMatch = result instanceof Promise ? await result : result;
				if (isMatch) {
					return true;
				}
			} catch (error) {
				logger.debug(`Error in condition: ${error instanceof Error ? error.message : String(error)}`);
			}
		}
		return false;
	};
}

// Negate a condition
export function not(condition: TriggerCondition): TriggerCondition {
	return async (message: Message) => !(await condition(message));
}

// Helper to escape regex special characters
function escapeRegExp(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


/**
 * Wraps a condition with the default bot behavior:
 * - By default, ignores all bot messages using enhanced filtering
 * - Only processes bot messages if the condition explicitly includes fromBot() or fromBotExcludingCovaBot()
 * - Always excludes CovaBot messages for production safety
 */
export function withDefaultBotBehavior(botName: string, condition: TriggerCondition): TriggerCondition {
	return async (message: Message): Promise<boolean> => {
		try {
			// Enhanced bot message filtering - excludes CovaBot and other specified bots
			if (message.author.bot && shouldExcludeFromReplyBots(message)) {
				if (isDebugMode()) {
					logger.debug(`[${botName}] 🚫 Message excluded by enhanced bot filtering`);
				}
				return false;
			}

			// For non-excluded bot messages, still apply the original logic
			if (message.author.bot) {
				if (isDebugMode()) {
					logger.debug(`[${botName}] ⚠️ Bot message detected but not excluded - condition must explicitly handle bots`);
				}
				// Let the condition decide if it wants to handle bot messages
			}

			// Check the condition
			const result = await condition(message);

			// Enhanced logging
			if (isDebugMode()) {
				const messageInfo = {
					author: message.author.username,
					isBot: message.author.bot,
					content: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
					result
				};

				if (result) {
					logger.debug(`[${botName}] ✅ Condition matched`, messageInfo);
				} else {
					logger.debug(`[${botName}] ❌ Condition did not match`, messageInfo);
				}
			}

			return result;
		} catch (error) {
			logger.error(`[${botName}] 💥 Error in condition:`,
				error instanceof Error ? error : new Error(String(error)));
			return false;
		}
	};
}

