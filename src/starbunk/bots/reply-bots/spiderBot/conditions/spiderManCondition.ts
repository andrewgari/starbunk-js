import { TriggerCondition } from "@/starbunk/bots/botTypes";
import { Message } from "discord.js";

/**
 * Condition that checks if a message contains "spiderman" or "spider man" without a hyphen
 */
export class SpiderManCondition implements TriggerCondition {
	private readonly spidermanPattern = /\b(spiderman|spider\s+man)\b/i;
	private readonly correctPattern = /\bspider-man\b/i;

	async shouldTrigger(message: Message): Promise<boolean> {
		// Don't trigger if the message contains the correct "Spider-Man" spelling
		if (message.content.match(this.correctPattern)) {
			return false;
		}

		// Trigger if the message contains "spiderman" or "spider man" (without hyphen)
		return this.spidermanPattern.test(message.content);
	}
}
