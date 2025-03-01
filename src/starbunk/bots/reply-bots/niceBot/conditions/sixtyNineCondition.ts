import { TriggerCondition } from "@/starbunk/bots/botTypes";
import { Patterns } from "@/starbunk/bots/triggers/conditions/patterns";
import { Message } from "discord.js";

/**
 * Condition that checks if a message contains "69" or "sixty-nine"
 */
export class SixtyNineCondition implements TriggerCondition {
	async shouldTrigger(message: Message): Promise<boolean> {
		return Patterns.SPECIAL_NICE_NUMBER.test(message.content);
	}
}
