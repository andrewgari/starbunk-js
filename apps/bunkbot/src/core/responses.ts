import { Message, TextChannel } from 'discord.js';
import { logger } from '@starbunk/shared';
import { getDiscordService } from '../services/bootstrap';
import { BotIdentity } from '../types/bot-identity';
import { ContextualResponseGenerator, ResponseContext, asResponseGenerator } from './response-context';

// Core response generator type - returns string based on message
export type ResponseGenerator = (message: Message) => string | Promise<string>;

/**
 * Typed static message to ensure it's non-empty
 */
export type StaticMessage = string & { readonly __brand: unique symbol };

export function createStaticMessage(text: string): StaticMessage {
	if (!text || text.trim().length === 0) {
		throw new Error('Static message cannot be empty');
	}
	return text as StaticMessage;
}

/**
 * Options for response randomization
 */
export interface RandomResponseOptions {
	allowRepetition?: boolean; // Whether to allow the same response consecutively
	weights?: number[]; // Optional weights for each response (must match options length)
}

// Creates a static text response
export function staticResponse(text: string | StaticMessage): ResponseGenerator {
	const staticText = typeof text === 'string' ? createStaticMessage(text) : text;
	return () => staticText.toString();
}

// Contextual version of staticResponse
export function contextStaticResponse(text: string | StaticMessage): ContextualResponseGenerator {
	const staticText = typeof text === 'string' ? createStaticMessage(text) : text;
	return () => staticText.toString();
}

// Keep track of last responses to avoid repetition
const lastResponses = new Map<string, string>();

export function randomResponse(responses: (string | StaticMessage)[]): string {
	return responses[Math.floor(Math.random() * responses.length)].toString();
}

// Creates a random response from an array of options
export function weightedRandomResponse(
	options: (string | StaticMessage)[],
	config: RandomResponseOptions = {},
): ResponseGenerator {
	if (!options || options.length === 0) {
		throw new Error('Random response options array cannot be empty');
	}

	// Validate weights if provided
	if (config.weights && config.weights.length !== options.length) {
		throw new Error('Weights array length must match options array length');
	}

	// Convert all string options to StaticMessage
	const validatedOptions = options.map((opt) => (typeof opt === 'string' ? createStaticMessage(opt) : opt));

	// Create a unique ID for this response set based on content
	const responseSetId = validatedOptions.map((o) => o.toString()).join('|');

	return (message: Message): string => {
		// Get the key for this message context
		const contextKey = `${responseSetId}:${message.channel.id}`;

		// Get the last response for this context
		const lastResponse = lastResponses.get(contextKey);

		// Choose a response, avoiding repetition if configured
		let response: string;
		let attempts = 0;
		const maxAttempts = validatedOptions.length * 2;

		do {
			// Select a response based on weights or randomly
			let index: number;
			if (config.weights) {
				// Weighted selection
				const totalWeight = config.weights.reduce((sum, w) => sum + w, 0);
				let rand = Math.random() * totalWeight;
				index = 0;

				while (index < config.weights.length - 1) {
					rand -= config.weights[index];
					if (rand <= 0) break;
					index++;
				}
			} else {
				// Uniform random selection
				index = Math.floor(Math.random() * validatedOptions.length);
			}

			response = validatedOptions[index].toString();
			attempts++;
		} while (
			!config.allowRepetition &&
			response === lastResponse &&
			attempts < maxAttempts &&
			validatedOptions.length > 1
		);

		// Remember this response to avoid repetition next time
		lastResponses.set(contextKey, response);

		// Limit the cache size
		if (lastResponses.size > 1000) {
			// Remove the oldest entries
			const keys = Array.from(lastResponses.keys());
			for (let i = 0; i < 200; i++) {
				lastResponses.delete(keys[i]);
			}
		}

		return response;
	};
}

// Contextual version of randomResponse
export function contextRandomResponse(
	options: (string | StaticMessage)[],
	config: RandomResponseOptions = {},
): ContextualResponseGenerator {
	const standardGenerator = weightedRandomResponse(options, config);
	return (context: ResponseContext) => standardGenerator(context.message);
}

// Template variable provider type
export type TemplateVariables = Record<string, string>;
export type VariableProvider = (message: Message) => TemplateVariables;
export type ContextualVariableProvider = (context: ResponseContext) => TemplateVariables;

// Creates a template response with variable substitution
export function templateResponse(template: string, variablesFn: VariableProvider): ResponseGenerator {
	if (!template || template.trim().length === 0) {
		throw new Error('Template string cannot be empty');
	}

	return (message: Message): string => {
		try {
			const variables = variablesFn(message);
			let response = template;

			// Replace variables in template
			for (const [key, value] of Object.entries(variables)) {
				response = response.replace(new RegExp(`{${key}}`, 'g'), value);
			}

			return response;
		} catch (error) {
			logger.error(`Error generating template response:`, error as Error);
			return template; // Return raw template as fallback
		}
	};
}

// Contextual version of templateResponse
export function contextTemplateResponse(
	template: string,
	variablesFn: ContextualVariableProvider,
): ContextualResponseGenerator {
	if (!template || template.trim().length === 0) {
		throw new Error('Template string cannot be empty');
	}

	return (context: ResponseContext): string => {
		try {
			const variables = variablesFn(context);
			let response = template;

			// Replace variables in template
			for (const [key, value] of Object.entries(variables)) {
				response = response.replace(new RegExp(`{${key}}`, 'g'), value);
			}

			return response;
		} catch (error) {
			logger.error(`Error generating contextual template response:`, error as Error);
			return template; // Return raw template as fallback
		}
	};
}

// Processes a message using regex group captures
export function regexCaptureResponse(pattern: RegExp, template: string): ResponseGenerator {
	if (!template || template.trim().length === 0) {
		throw new Error('Template string cannot be empty');
	}

	return (message: Message) => {
		try {
			const match = message.content.match(pattern);
			if (!match) return template;

			// Replace $1, $2, etc. with captured groups
			return template.replace(/\$(\d+)/g, (_, index) => {
				const groupNum = parseInt(index);
				return match[groupNum] || '';
			});
		} catch (error) {
			logger.error(`Error generating regex capture response:`, error as Error);
			return template; // Return raw template as fallback
		}
	};
}

// Contextual version of regexCaptureResponse
export function contextRegexCaptureResponse(pattern: RegExp, template: string): ContextualResponseGenerator {
	if (!template || template.trim().length === 0) {
		throw new Error('Template string cannot be empty');
	}

	return (context: ResponseContext) => {
		try {
			const match = context.content.match(pattern);
			if (!match) return template;

			// Replace $1, $2, etc. with captured groups
			return template.replace(/\$(\d+)/g, (_, index) => {
				const groupNum = parseInt(index);
				return match[groupNum] || '';
			});
		} catch (error) {
			logger.error(`Error generating contextual regex capture response:`, error as Error);
			return template; // Return raw template as fallback
		}
	};
}

// Helper function to send a response with a specific bot identity
export async function sendBotResponse(
	message: Message,
	identity: BotIdentity,
	responseGenerator: ResponseGenerator,
	botName: string,
): Promise<void> {
	try {
		const channel = message.channel as TextChannel;
		const responseText = await responseGenerator(message);

		if (!responseText || responseText.trim().length === 0) {
			logger.warn(`[${botName}] Empty response generated, not sending`);
			return;
		}

		logger.debug(`[${botName}] Sending response: "${responseText.substring(0, 100)}..."`);
		await getDiscordService().sendMessageWithBotIdentity(channel.id, identity, responseText);
		logger.debug(`[${botName}] Response sent successfully`);
	} catch (error) {
		logger.error(`[${botName}] Error sending response:`, error as Error);
		throw error;
	}
}

// Contextual version of sendBotResponse
export async function sendContextBotResponse(
	context: ResponseContext,
	identity: BotIdentity,
	responseGenerator: ContextualResponseGenerator,
	botName: string,
): Promise<void> {
	try {
		const channel = context.channel;
		const responseText = await responseGenerator(context);

		if (!responseText || responseText.trim().length === 0) {
			logger.warn(`[${botName}] Empty response generated from context, not sending`);
			return;
		}

		logger.debug(`[${botName}] Sending contextual response: "${responseText.substring(0, 100)}..."`);
		await getDiscordService().sendMessageWithBotIdentity(channel.id, identity, responseText);
		logger.debug(`[${botName}] Contextual response sent successfully`);
	} catch (error) {
		logger.error(`[${botName}] Error sending contextual response:`, error as Error);
		throw error;
	}
}

// Convert contextual response generators to standard response generators
export function convertContextualResponses(generators: ContextualResponseGenerator[]): ResponseGenerator[] {
	return generators.map((generator) => asResponseGenerator(generator));
}
