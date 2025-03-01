import { TriggerCondition } from "@/starbunk/bots/botTypes";
import { Patterns } from "@/starbunk/bots/triggers/conditions/patterns";
import { Message } from "discord.js";

/**
 * Condition that checks if a message contains the word "hold"
 */
export class HoldCondition implements TriggerCondition {
	async shouldTrigger(message: Message): Promise<boolean> {
		return Patterns.WORD_HOLD.test(message.content);
	}
}
