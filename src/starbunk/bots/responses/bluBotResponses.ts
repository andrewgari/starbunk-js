import { Message } from 'discord.js';
import { ResponseGenerator } from '../botTypes';
import { isVenn } from '../triggers/userConditions';

/**
 * Interface for triggers that can extract names from message patterns
 */
interface NiceMessageTrigger {
	getNameFromMessage(message: Message): string;
}

/**
 * Response for nice messages that extracts a name from the message
 */
export class NiceMessageResponse implements ResponseGenerator {
	constructor(private niceTrigger: NiceMessageTrigger) { }

	async generateResponse(message: Message): Promise<string> {
		// Get name from trigger, defaulting to 'Friend' if null/undefined
		const name = this.niceTrigger.getNameFromMessage(message) || 'Friend';

		// Special case for Venn - safely check with optional chaining
		if (name.toLowerCase() === 'venn') {
			return 'No way, Venn can suck my blu cane. :unamused:';
		}

		return `${name}, I think you're pretty Blu! :wink:`;
	}
}

/**
 * Response that changes based on the user
 */
export class UserAwareResponse implements ResponseGenerator {
	constructor(
		private defaultResponse: string,
		private vennResponse: string
	) { }

	async generateResponse(message: Message): Promise<string> {
		if (isVenn(message)) {
			return this.vennResponse;
		}
		return this.defaultResponse;
	}
}

/**
 * Response that selects from multiple response generators based on conditions
 */
export class ConditionalResponse implements ResponseGenerator {
	constructor(
		private responseMap: Array<{
			condition: (message: Message) => Promise<boolean> | boolean;
			response: ResponseGenerator;
		}>,
		private defaultResponse: ResponseGenerator
	) { }

	async generateResponse(message: Message): Promise<string | null> {
		for (const { condition, response } of this.responseMap) {
			const result = condition(message);
			const shouldUse = result instanceof Promise ? await result : result;

			if (shouldUse) {
				const responseText = await response.generateResponse(message);
				if (responseText !== null) {
					return responseText;
				}
			}
		}

		return this.defaultResponse.generateResponse(message);
	}
}
