import { Message } from 'discord.js';
import { TriggerCondition } from '../botTypes';
import { isBot } from './userConditions';

/**
 * Base class for pattern-based triggers
 */
export class BasePatternTrigger implements TriggerCondition {
	constructor(private pattern: RegExp) { }

	async shouldTrigger(message: Message): Promise<boolean> {
		if (isBot(message)) return false;
		return this.pattern.test(message.content);
	}
}

/**
 * Trigger for "blue" mentions specific to BlueBot
 */
export class BlueBotMentionTrigger extends BasePatternTrigger {
	constructor() {
		super(/\bblue?\b/i);
	}
}

/**
 * Generic trigger for interactions/confirmations/acknowledgements
 * This includes both positive acknowledgements and mean/insult patterns
 */
export class GenericInteractionTrigger extends BasePatternTrigger {
	constructor() {
		// Include both acknowledgement patterns and mean patterns
		super(/\b(yes|no|yep|yeah|(i did)|(you got it)|(sure did)|fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i);
	}
}

/**
 * Generic trigger for insults
 */
export class GenericInsultTrigger extends BasePatternTrigger {
	constructor() {
		super(/\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i);
	}
}

/**
 * BlueBot-specific trigger for nice message requests
 */
export class BlueBotNiceMessageTrigger implements TriggerCondition {
	private pattern = /blue?bot,? say something nice about (?<n>.+$)/i;

	async shouldTrigger(message: Message): Promise<boolean> {
		if (isBot(message)) return false;
		return this.pattern.test(message.content);
	}

	/**
   * Extract the name from the message
   * @param message The Discord message
   * @returns The name mentioned in the message
   */
	getNameFromMessage(message: Message): string {
		const matches = message.content.match(this.pattern);
		if (!matches?.groups?.n) return 'Hey';
		const name = matches.groups.n;
		if (name === 'me') {
			return message.member?.displayName ?? message.author.displayName;
		}
		return name;
	}
}
