import { Message } from 'discord.js';
import { BotFactory } from './core/bot-factory';
import { createTriggerResponse } from './core/trigger-response';
import { ReplyBotImpl, MessageFilterFunction } from './core/bot-builder';

/**
 * Configuration options for the simplified createBot function
 */
export interface SimpleBotConfig {
	/** The name of your bot */
	name: string;
	/** A description of what your bot does */
	description: string;
	/** Array of regular expressions that trigger your bot */
	patterns: RegExp[];
	/** Array of possible responses */
	responses: string[];
	/** URL to the avatar image for your bot (optional) */
	avatarUrl?: string;
	/** Percentage chance of responding (0-100, optional) */
	responseRate?: number;
	/** Custom message filtering function (optional, uses default filtering if not provided) */
	messageFilter?: MessageFilterFunction;
}

/**
 * Simplified function for creating reply bots with minimal configuration
 *
 * Handles different combinations of patterns and responses:
 * 1. One pattern, one response: Always responds with the same message
 * 2. Multiple patterns, one response: Same message for any matching pattern
 * 3. Multiple patterns, multiple responses (equal count): Each pattern matched with corresponding response
 * 4. One pattern, multiple responses: Randomly selects one of the responses
 *
 */
export function createBot(config: SimpleBotConfig): ReplyBotImpl {
	// Validate required fields
	if (!config.name || config.name.trim() === '') {
		throw new Error('Bot name is required');
	}
	if (!config.description || config.description.trim() === '') {
		throw new Error('Bot description is required');
	}
	if (!config.patterns || config.patterns.length === 0) {
		throw new Error('At least one pattern is required');
	}
	if (!config.responses || config.responses.length === 0) {
		throw new Error('At least one response is required');
	}

	const patterns = config.patterns;
	const responses = config.responses;

	// Create trigger-response pairs based on pattern/response combinations
	const triggers = createTriggerResponsePairs(patterns, responses);

	// Use custom messageFilter if provided, otherwise use enhanced default filter
	const messageFilter: MessageFilterFunction = config.messageFilter || createEnhancedMessageFilter();

	// Create bot using BotFactory with simplified configuration
	return BotFactory.createBot({
		name: config.name,
		description: config.description,
		defaultIdentity: {
			botName: config.name,
			avatarUrl: config.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/1.png',
		},
		triggers,
		responseRate: config.responseRate,
		messageFilter,
	});
}

/**
 * Create trigger-response pairs based on pattern/response combinations
 */
function createTriggerResponsePairs(patterns: RegExp[], responses: string[]) {
	const triggers = [];

	if (patterns.length === 1 && responses.length === 1) {
		// Case 1: One pattern, one response
		triggers.push(
			createTriggerResponse({
				name: 'simple-trigger',
				condition: (message: Message) => patterns[0].test(message.content),
				response: () => responses[0],
				priority: 1,
			}),
		);
	} else if (patterns.length > 1 && responses.length === 1) {
		// Case 2: Multiple patterns, one response
		triggers.push(
			createTriggerResponse({
				name: 'multi-pattern-single-response',
				condition: (message: Message) => patterns.some((pattern) => pattern.test(message.content)),
				response: () => responses[0],
				priority: 1,
			}),
		);
	} else if (patterns.length === responses.length && patterns.length > 1) {
		// Case 3: Multiple patterns, multiple responses (equal count)
		patterns.forEach((pattern, index) => {
			triggers.push(
				createTriggerResponse({
					name: `pattern-response-${index}`,
					condition: (message: Message) => pattern.test(message.content),
					response: () => responses[index],
					priority: 1,
				}),
			);
		});
	} else if (patterns.length === 1 && responses.length > 1) {
		// Case 4: One pattern, multiple responses
		triggers.push(
			createTriggerResponse({
				name: 'single-pattern-multi-response',
				condition: (message: Message) => patterns[0].test(message.content),
				response: () => {
					const randomIndex = Math.floor(Math.random() * responses.length);
					return responses[randomIndex];
				},
				priority: 1,
			}),
		);
	} else {
		// Fallback: Create one trigger per pattern, cycle through responses
		patterns.forEach((pattern, patternIndex) => {
			triggers.push(
				createTriggerResponse({
					name: `pattern-${patternIndex}`,
					condition: (message: Message) => pattern.test(message.content),
					response: () => {
						const responseIndex = patternIndex % responses.length;
						return responses[responseIndex];
					},
					priority: 1,
				}),
			);
		});
	}

	return triggers;
}

/**
 * Enhanced message filter that uses the simplified filtering logic
 * Only excludes BunkBot self-messages, allows all other messages
 */
function createEnhancedMessageFilter(): MessageFilterFunction {
	return async (message: Message) => {
		// Skip if message is from BunkBot itself (self-message)
		if (!message?.author) return true;
		if (message.client?.user && message.author.id === message.client.user.id) {
			return true;
		}
		return false;
	};
}
