import { Message } from 'discord.js';
import { ResponseGenerator, TriggerCondition } from './botTypes';

/**
 * A pair of condition and response
 */
export interface ConditionResponsePair {
	/**
	 * The response generator to use when the condition matches
	 */
	responseGenerator: ResponseGenerator;

	/**
	 * The condition that determines if this response should be used
	 * Returns true if the condition matches
	 */
	condition: (message: Message) => Promise<boolean>;

	/**
	 * Optional callback to run when this condition matches
	 */
	onMatch?: (message: Message) => Promise<void>;
}

/**
 * A handler for condition-response pairs
 * This allows for a more declarative approach to defining bot behavior
 */
export class ConditionResponseHandler implements ResponseGenerator {
	private pairs: ConditionResponsePair[] = [];

	/**
	 * Create a new ConditionResponseHandler
	 * @param pairs Optional initial condition-response pairs
	 */
	constructor(pairs: ConditionResponsePair[] = []) {
		this.pairs = pairs;
	}

	/**
	 * Add a condition-response pair
	 * @param responseGenerator The response generator to use when the condition matches
	 * @param condition The condition that determines if this response should be used
	 * @param onMatch Optional callback to run when this condition matches
	 */
	addPair(
		responseGenerator: ResponseGenerator,
		condition: (message: Message) => Promise<boolean>,
		onMatch?: (message: Message) => Promise<void>
	): void {
		this.pairs.push({
			responseGenerator,
			condition,
			onMatch
		});
	}

	/**
	 * Add a new condition-response pair using a TriggerCondition object
	 * @param response The response generator to use when the trigger matches
	 * @param trigger The trigger condition that determines if this pair should be used
	 * @param onMatch Optional callback to execute when this pair matches
	 */
	addTriggerPair(response: ResponseGenerator, trigger: TriggerCondition, onMatch?: (message: Message) => Promise<void>): void {
		// Convert the trigger to a condition function
		const condition = (message: Message): Promise<boolean> => trigger.shouldTrigger(message);

		// Add the pair
		this.addPair(response, condition, onMatch);
	}

	/**
	 * Generate a response for a message
	 * @param message The message to generate a response for
	 * @returns The generated response, or null if no condition matches
	 */
	async generateResponse(message: Message): Promise<string | null> {
		// Check each pair in reverse order (last added has highest priority)
		for (let i = this.pairs.length - 1; i >= 0; i--) {
			const pair = this.pairs[i];
			if (await pair.condition(message)) {
				// Run the onMatch callback if provided
				if (pair.onMatch) {
					await pair.onMatch(message);
				}

				// Generate the response
				return pair.responseGenerator.generateResponse(message);
			}
		}

		return null;
	}

	/**
	 * Find all matching responses for a message
	 * @param message The message to generate responses for
	 * @returns Array of matching response generators
	 */
	async findAllMatches(message: Message): Promise<ResponseGenerator[]> {
		const matches: ResponseGenerator[] = [];

		// Check each pair in reverse order (last added has highest priority)
		for (let i = this.pairs.length - 1; i >= 0; i--) {
			const pair = this.pairs[i];
			if (await pair.condition(message)) {
				// Run the onMatch callback if provided
				if (pair.onMatch) {
					await pair.onMatch(message);
				}

				matches.push(pair.responseGenerator);
			}
		}

		return matches;
	}

	/**
	 * Generate all matching responses for a message
	 * @param message The message to generate responses for
	 * @returns Array of generated responses (non-null only)
	 */
	async generateAllResponses(message: Message): Promise<string[]> {
		const responses: string[] = [];
		const matches = await this.findAllMatches(message);

		// Generate responses from all matches
		for (const responseGen of matches) {
			const response = await responseGen.generateResponse(message);
			if (response !== null) {
				responses.push(response);
			}
		}

		return responses;
	}
}
