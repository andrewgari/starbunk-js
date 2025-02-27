import { Message } from 'discord.js';

export interface BotIdentity {
	name: string;
	avatarUrl: string;
}

export interface TriggerCondition {
	shouldTrigger(message: Message): Promise<boolean>;
}

export interface ResponseGenerator {
	generateResponse(message: Message): Promise<string | null>;
}

/**
 * Interface for condition response data
 */
export interface ConditionResponseData {
	responseGenerator: ResponseGenerator;
	identity?: Partial<BotIdentity>;
	[key: string]: unknown;
}

// Simple pattern-based trigger
export class PatternTrigger implements TriggerCondition {
	constructor(private pattern: RegExp) { }

	async shouldTrigger(message: Message): Promise<boolean> {
		return this.pattern.test(message.content);
	}
}

// Simple single response
export class StaticResponse implements ResponseGenerator {
	constructor(private response: string) { }

	async generateResponse(message: Message): Promise<string> {
		// Replace {username} with the message author's username or displayName
		let formattedResponse = this.response;
		if (message && message.author) {
			const username = message.author.globalName || message.author.username || 'User';
			formattedResponse = formattedResponse.replace(/{username}/g, username);
		}
		return formattedResponse;
	}
}

// Random response from list
export class RandomResponse implements ResponseGenerator {
	constructor(private responses: string[]) { }

	async generateResponse(): Promise<string> {
		const index = Math.floor(Math.random() * this.responses.length);
		return this.responses[index];
	}
}
