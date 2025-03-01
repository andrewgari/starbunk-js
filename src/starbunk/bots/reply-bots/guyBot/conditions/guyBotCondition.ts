import { TriggerCondition } from "@/starbunk/bots/botTypes";
import { AllConditions } from "@/starbunk/bots/triggers/conditions/allConditions";
import { OneCondition } from "@/starbunk/bots/triggers/conditions/oneCondition";
import { PatternCondition } from "@/starbunk/bots/triggers/conditions/patternCondition";
import { Patterns } from "@/starbunk/bots/triggers/conditions/patterns";
import { RandomChanceCondition } from "@/starbunk/bots/triggers/conditions/randomChanceCondition";
import { getGuyCondition } from "@/starbunk/bots/triggers/userConditions";
import { Message } from "discord.js";
import { RANDOM_RESPONSE_CHANCE_PERCENT } from "../guyBotModel";

/**
 * Combined condition for GuyBot that checks for:
 * 1. Messages containing "guy"
 * 2. Random chance (5%)
 * 3. Messages from Guy
 */
export class GuyBotCondition implements TriggerCondition {
	private combinedCondition: TriggerCondition;

	constructor() {
		// Get the condition for checking if the message is from Guy
		const guyUserCondition = getGuyCondition();

		// Create a combined condition using OneCondition
		this.combinedCondition = new OneCondition(
			new PatternCondition(Patterns.WORD_GUY),
			new AllConditions(
				new RandomChanceCondition(RANDOM_RESPONSE_CHANCE_PERCENT),
				guyUserCondition
			)
		);
	}

	async shouldTrigger(message: Message): Promise<boolean> {
		return this.combinedCondition.shouldTrigger(message);
	}
}
