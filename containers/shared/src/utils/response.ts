import { Message as DiscordMessage } from 'discord.js';

/**
 * A function that generates a response string, optionally asynchronously.
 */
export type ResponseGenerator = (message: DiscordMessage) => string | Promise<string>;

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

// Keep track of last responses to avoid repetition
const lastResponses = new Map<string, string>();

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

	return (message: DiscordMessage): string => {
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
