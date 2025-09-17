import { isDebugMode, logger, getTestingChannelIds } from '@starbunk/shared';
import { extractWebhookId } from '../utils/webhook';

import { Message } from 'discord.js';

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
	EXCLUDED_BOT_IDS: [] as string[], // Can be populated with specific bot user IDs
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
export const matchesPattern =
	(pattern: RegExp): TriggerCondition =>
	(message: Message) =>
		pattern.test(message.content);

// Contextual version of matchesPattern
export const contextMatchesPattern =
	(pattern: RegExp): ContextualTriggerCondition =>
	(context: ResponseContext) =>
		pattern.test(context.content);

// Check if message contains a specific word (not substring)
export const containsWord = (word: string): TriggerCondition => {
	const wordRegex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
	return (message: Message) => wordRegex.test(message.content);
};

// Contextual version of containsWord
export const contextContainsWord =
	(word: string): ContextualTriggerCondition =>
	(context: ResponseContext) =>
		context.hasWord(word);

// Check if message contains a phrase (substring)
export function containsPhrase(phrase: string): TriggerCondition {
	return (message: Message) => message.content.toLowerCase().includes(phrase.toLowerCase());
}

// Contextual version of containsPhrase
export function contextContainsPhrase(phrase: string): ContextualTriggerCondition {
	return (context: ResponseContext) => context.hasPhrase(phrase);
}

// Check if message is from specific user
export function fromUser(userId: string | UserId): TriggerCondition {
	return (message: Message) => {
		const id = typeof userId === 'string' ? createUserId(userId) : userId;
		return message.author.id === id;
	};
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
		const _result = random <= chance;
		logger.debug(`withChance(${chance}): random=${Math.round(random)}, result=${_result}`);
		return _result;
	};
}

// Check if message is from a bot
export function fromBot(includeSelf = true): TriggerCondition {
	return (message: Message): boolean => {
		if (!message || !message.author) return false;
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
	// Handle null/undefined author gracefully
	if (!message?.author) return false;

	// Check if message is from a bot first
	if (!message.author.bot) return false;

	// Handle null/undefined username gracefully with logging
	let username: string;
	if (message.author.username == null) {
		logger.warn(`[isCovaBot] message.author.username is ${message.author.username} for message ID: ${message.id}`, {
			author: message.author,
		});
		username = '';
	} else {
		username = message.author.username.toLowerCase();
	}

	let displayName: string;
	if (message.author.displayName == null) {
		logger.warn(
			`[isCovaBot] message.author.displayName is ${message.author.displayName} for message ID: ${message.id}`,
			{ author: message.author },
		);
		displayName = '';
	} else {
		displayName = message.author.displayName.toLowerCase();
	}

	// Check for CovaBot-specific identifiers (exact match, not substring)
	const isCovaUsername = BOT_IDENTIFIERS.COVABOT_USERNAMES.some(
		(name) => username === name.toLowerCase() || displayName === name.toLowerCase(),
	);

	// Check webhook names if available (for webhook-sent messages)
	const isCovaWebhook = message.webhookId
		? BOT_IDENTIFIERS.COVABOT_WEBHOOK_NAMES.some(
				(name) => username === name.toLowerCase() || displayName === name.toLowerCase(),
			)
		: false;

	const _result = isCovaUsername || isCovaWebhook;

	if (isDebugMode()) {
		logger.debug(`🤖 CovaBot Detection:`, {
			username: message.author.username,
			displayName: message.author.displayName,
			isBot: message.author.bot,
			webhookId: message.webhookId,
			isCovaUsername,
			isCovaWebhook,
			result: _result,
		});
	}

	return _result;
}

/**
 * Check if message should be excluded from reply bot processing
 * Excludes: BunkBot self-messages, CovaBot, DJCova, and other specified bots
 */
export function shouldExcludeFromReplyBots(message: Message): boolean {
	// Handle null/undefined message or author gracefully
	if (!message?.author) return true; // Exclude malformed messages

	// Exclude if the message is from BunkBot itself (same client)
	if (message.client?.user && message.author.id === message.client.user.id) {
		if (isDebugMode()) {
			logger.debug(`❌ Excluding BunkBot self-message from reply bot processing`);
		}
		return true;
	}

	// Fast-path allow for non-bot messages after self-check
	if (!message.author.bot) {
		if (isDebugMode()) {
			logger.debug(`✅ Allowing human message for reply bot processing from: ${message.author.username}`);
		}
		return false;
	}

	// Exclude messages from specified bots (CovaBot, DJCova, etc.)
	const authorName = message.author.username;
	if (BOT_IDENTIFIERS.EXCLUDED_BOT_NAMES.includes(authorName)) {
		if (isDebugMode()) {
			logger.debug(`❌ Excluding message from excluded bot: ${authorName}`);
		}
		return true;
	}

	// Exclude webhook messages from BunkBot reply bots to prevent self-triggering loops
	if (message.webhookId && message.author.bot) {
		// Allow explicit E2E webhook test messages when enabled, channel is whitelisted,
		// and the message originated from the configured E2E webhook
		const allowWebhookTests = process.env.E2E_ALLOW_WEBHOOK_TESTS === 'true';
		if (allowWebhookTests) {
			const allowedChannels = getTestingChannelIds();
			const e2eWebhookUrl = process.env.E2E_TEST_WEBHOOK_URL || '';
			const e2eWebhookId = extractWebhookId(e2eWebhookUrl);

			if (
				allowedChannels.length > 0 &&
				allowedChannels.includes(message.channel.id) &&
				e2eWebhookId &&
				message.webhookId === e2eWebhookId
			) {
				if (isDebugMode()) {
					logger.debug(
						`✅ Allowing E2E webhook test message in channel ${message.channel.id} from webhook ${e2eWebhookId}`,
					);
				}
				return false; // do not exclude; let bots process this specific E2E webhook message
			}
		}

		// Check if this is a webhook message from a BunkBot reply bot
		// Reply bots use custom webhook names like "HoldBot", "TestBot", etc.

		// If it's NOT from an excluded bot (like CovaBot), it's likely a BunkBot webhook
		if (!BOT_IDENTIFIERS.EXCLUDED_BOT_NAMES.includes(authorName)) {
			// This is likely a BunkBot reply bot webhook - exclude it to prevent loops
			if (isDebugMode()) {
				logger.debug(
					`❌ Excluding BunkBot reply bot webhook message from: ${authorName} (webhook ID: ${message.webhookId})`,
				);
			}
			return true;
		}
	}

	// Allow all other messages (human, whitelisted bots, etc.)
	if (isDebugMode()) {
		logger.debug(`✅ Allowing message for reply bot processing from: ${message.author.username}`);
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
		// Handle null/undefined message or author gracefully
		if (!message || !message.author) return false;

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
	unit: TimeUnit,
): TriggerCondition {
	const dur = typeof duration === 'number' ? createDuration(duration) : duration;
	const multipliers = {
		ms: 1,
		s: 1000,
		m: 60 * 1000,
		h: 60 * 60 * 1000,
		d: 24 * 60 * 60 * 1000,
	};
	const durationMs = dur * multipliers[unit];
	return () => {
		const _now = Date.now();
		const timestamp = timestampFn();
		const _result = _now - timestamp <= durationMs;
		return _result;
	};
}

// Contextual version of withinTimeframeOf
export function contextWithinTimeframeOf(
	timestampFn: () => number,
	duration: number | Duration,
	unit: TimeUnit,
): ContextualTriggerCondition {
	const dur = typeof duration === 'number' ? createDuration(duration) : duration;
	const multipliers = {
		ms: 1,
		s: 1000,
		m: 60 * 1000,
		h: 60 * 60 * 1000,
		d: 24 * 60 * 60 * 1000,
	};
	const durationMs = dur * multipliers[unit];
	return () => {
		const _now = Date.now();
		const timestamp = timestampFn();
		return _now - timestamp <= durationMs;
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
			const _result = condition(message);
			const isMatch = _result instanceof Promise ? await _result : _result;
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
				const _result = condition(message);
				const isMatch = _result instanceof Promise ? await _result : _result;
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
					logger.debug(
						`[${botName}] ⚠️ Bot message detected but not excluded - condition must explicitly handle bots`,
					);
				}
				// Let the condition decide if it wants to handle bot messages
			}

			// Check the condition
			const _result = await condition(message);

			// Enhanced logging
			if (isDebugMode()) {
				const messageInfo = {
					author: message.author.username,
					isBot: message.author.bot,
					content: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
					result: _result,
				};

				if (_result) {
					logger.debug(`[${botName}] ✅ Condition matched`, messageInfo);
				} else {
					logger.debug(`[${botName}] ❌ Condition did not match`, messageInfo);
				}
			}

			return _result;
		} catch (error) {
			logger.error(
				`[${botName}] 💥 Error in condition:`,
				error instanceof Error ? error : new Error(String(error)),
			);
			return false;
		}
	};
}
