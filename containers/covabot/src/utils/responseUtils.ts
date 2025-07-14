import { Message } from 'discord.js';

/**
 * Function that generates a response message
 */
export interface ResponseGenerator {
	(message: Message): Promise<string> | string;
}

/**
 * Options for weighted random responses
 */
export interface RandomResponseOptions {
	weights?: number[];
	seed?: number;
}

/**
 * Creates a weighted random response generator
 * @param options Array of response options
 * @param config Configuration for randomization
 * @returns Response generator function
 */
export function weightedRandomResponse(
	options: string[],
	config: RandomResponseOptions = {}
): ResponseGenerator {
	if (!options || options.length === 0) {
		throw new Error('Random response options array cannot be empty');
	}

	const { weights } = config;

	return (_message: Message): string => {
		if (weights && weights.length === options.length) {
			// Weighted selection
			const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
			let random = Math.random() * totalWeight;
			
			for (let i = 0; i < options.length; i++) {
				random -= weights[i];
				if (random <= 0) {
					return options[i];
				}
			}
		}
		
		// Simple random selection
		return options[Math.floor(Math.random() * options.length)];
	};
}

/**
 * Creates a simple random response from an array
 * @param responses Array of response options
 * @returns Random response string
 */
export function randomResponse(responses: string[]): string {
	return responses[Math.floor(Math.random() * responses.length)];
}
