import { Message } from 'discord.js';

export interface BotIdentity {
	name: string;
	avatarUrl: string;
}

export interface TriggerCondition {
	shouldTrigger(message: Message): Promise<boolean>;
}

export interface ResponseGenerator {
	generateResponse(message: Message): Promise<string>;
}

// Simple pattern-based trigger
export class PatternTrigger implements TriggerCondition {
	constructor(private pattern: RegExp) { }

	async shouldTrigger(message: Message): Promise<boolean> {
		return this.pattern.test(message.content);
	}
}

// Random chance trigger for specific user
export class UserRandomTrigger implements TriggerCondition {
	constructor(private userId: string, private chance: number) { }

	async shouldTrigger(message: Message): Promise<boolean> {
		return message.author.id === this.userId && Math.random() * 100 < this.chance;
	}
}

// Combines multiple triggers with OR logic
export class CompositeTrigger implements TriggerCondition {
	constructor(private triggers: TriggerCondition[]) { }

	async shouldTrigger(message: Message): Promise<boolean> {
		for (const trigger of this.triggers) {
			if (await trigger.shouldTrigger(message)) {
				return true;
			}
		}
		return false;
	}
}

// Simple single response
export class StaticResponse implements ResponseGenerator {
	constructor(private response: string) { }

	async generateResponse(): Promise<string> {
		return this.response;
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
