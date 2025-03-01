import { PatternCondition } from "@/starbunk/bots/triggers/conditions/patternCondition";
import { Patterns } from "@/starbunk/bots/triggers/conditions/patterns";
import { Message } from "discord.js";

/**
 * BluNiceRequestCondition - A condition for handling "say something nice about" requests
 * Extracts the name from the pattern's capture group
 */
export class BluNiceRequestCondition extends PatternCondition {
	constructor() {
		super(Patterns.BLUEBOT_NICE_REQUEST_NAMED);
	}

	/**
	 * Extract the name from the nice message request
	 *
	 * @param message - The Discord message containing the request
	 * @returns The name mentioned in the message, or "Friend" if no name is found
	 */
	getNameFromMessage(message: Message): string {
		const matches = message.content.match(this.pattern);
		if (!matches?.groups?.n) return 'Friend';
		const name = matches.groups.n.trim();
		if (name.toLowerCase() === 'me') {
			return message.member?.displayName ?? message.author.displayName;
		}
		return name;
	}
}
