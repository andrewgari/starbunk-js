import { Message } from 'discord.js';
import { ResponseGenerator, TriggerCondition } from './botTypes';

/**
 * Represents a condition-response pair for handling messages
 */
export interface ConditionResponsePair {
	condition: (message: Message) => Promise<boolean>;
	response: ResponseGenerator;
	onMatch?: () => void; // Optional callback for when this pair matches
}

/**
 * A response generator that handles prioritized condition-response pairs
 * This allows for cleaner, more declarative bot logic by pairing conditions
 * directly with their responses
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
	 * Add a new condition-response pair with the highest priority
	 * @param response The response generator to use when the condition matches
	 * @param condition The condition function that determines if this pair should be used
	 * @param onMatch Optional callback to execute when this pair matches
	 */
	addPair(response: ResponseGenerator, condition: (message: Message) => Promise<boolean>, onMatch?: () => void): this {
		this.pairs.push({ condition, response, onMatch });
		return this;
	}

	/**
	 * Add a new condition-response pair using a TriggerCondition object
	 * @param response The response generator to use when the trigger matches
	 * @param trigger The trigger condition that determines if this pair should be used
	 * @param onMatch Optional callback to execute when this pair matches
	 */
	addTriggerPair(response: ResponseGenerator, trigger: TriggerCondition, onMatch?: () => void): this {
		return this.addPair(response, (message) => trigger.shouldTrigger(message), onMatch);
	}

	/**
	 * Generate a response based on the first matching condition
	 * @param message The Discord message to respond to
	 * @returns The generated response, or empty string if no conditions match
	 */
	async generateResponse(message: Message): Promise<string> {
		// Check each condition-response pair in priority order
		for (const pair of this.pairs) {
			if (await pair.condition(message)) {
				// Call the onMatch callback if provided
				if (pair.onMatch) {
					pair.onMatch();
				}
				return await pair.response.generateResponse(message);
			}
		}

		return '';
	}
}
