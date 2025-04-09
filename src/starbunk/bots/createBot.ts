import { BotIdentity } from '../types/botIdentity';
import { BotFactory } from './core/bot-factory';
import { createTriggerResponse, TriggerResponse } from './core/trigger-response';
import { matchesPattern } from './core/conditions';
import { staticResponse } from './core/responses';
import { ReplyBotImpl } from './core/bot-builder';

/**
 * Interface for simplified bot configuration
 */
export interface SimpleBotConfig {
	name: string;
	description: string;
	patterns: RegExp[];
	responses: string[];
	avatarUrl?: string;
	responseRate?: number;
	skipBotMessages?: boolean;
}

/**
 * Create a bot with minimal configuration
 * @param config Simplified bot configuration
 * @returns A reply bot implementation
 */
export function createBot(config: SimpleBotConfig): ReplyBotImpl {
	// Validate config
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

	// Create triggers from patterns and responses
	const triggers: TriggerResponse[] = [];

	// If there are multiple patterns but only one response, use the same response for all patterns
	if (config.patterns.length > 1 && config.responses.length === 1) {
		config.patterns.forEach((pattern, index) => {
			triggers.push(
				createTriggerResponse({
					name: `${config.name.toLowerCase()}-trigger-${index}`,
					condition: matchesPattern(pattern),
					response: staticResponse(config.responses[0]),
					priority: 1,
				}),
			);
		});
	}
	// If there are multiple patterns and multiple responses, match them up
	else if (config.patterns.length === config.responses.length) {
		config.patterns.forEach((pattern, index) => {
			triggers.push(
				createTriggerResponse({
					name: `${config.name.toLowerCase()}-trigger-${index}`,
					condition: matchesPattern(pattern),
					response: staticResponse(config.responses[index]),
					priority: 1,
				}),
			);
		});
	}
	// If there are multiple responses but only one pattern, randomly select a response
	else if (config.patterns.length === 1 && config.responses.length > 1) {
		triggers.push(
			createTriggerResponse({
				name: `${config.name.toLowerCase()}-trigger`,
				condition: matchesPattern(config.patterns[0]),
				response: () => {
					const randomIndex = Math.floor(Math.random() * config.responses.length);
					return Promise.resolve(config.responses[randomIndex]);
				},
				priority: 1,
			}),
		);
	}
	// Otherwise, just use the first pattern and first response
	else {
		triggers.push(
			createTriggerResponse({
				name: `${config.name.toLowerCase()}-trigger`,
				condition: matchesPattern(config.patterns[0]),
				response: staticResponse(config.responses[0]),
				priority: 1,
			}),
		);
	}

	// Create default identity
	const defaultIdentity: BotIdentity = {
		botName: config.name,
		avatarUrl: config.avatarUrl || '',
	};

	// Create and return the bot
	return BotFactory.createBot({
		name: config.name,
		description: config.description,
		defaultIdentity,
		triggers,
		defaultResponseRate: config.responseRate,
		skipBotMessages: config.skipBotMessages !== undefined ? config.skipBotMessages : true,
	});
}
