import { ResponseGenerator } from "@/starbunk/bots/botTypes";
import { Message } from "discord.js";
import { NICE_RESPONSE_TEMPLATE } from "../blueBotModel";
import { BluNiceRequestCondition } from "../conditions/bluNiceRequestCondition";

/**
 * Custom response generator for nice messages
 */
export class BluNiceResponseGenerator implements ResponseGenerator {
	private condition: BluNiceRequestCondition;

	constructor(condition: BluNiceRequestCondition) {
		this.condition = condition;
	}

	async generateResponse(message: Message): Promise<string> {
		const name = this.condition.getNameFromMessage(message);
		return NICE_RESPONSE_TEMPLATE.replace('{name}', name);
	}
}
