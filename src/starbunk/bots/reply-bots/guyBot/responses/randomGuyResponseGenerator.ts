import { ResponseGenerator } from "@/starbunk/bots/botTypes";
import { RESPONSES } from "../guyBotModel";

/**
 * Response generator that provides a random Guy quote
 */
export class RandomGuyResponseGenerator implements ResponseGenerator {
	async generateResponse(): Promise<string> {
		// Select a random response from the array
		const randomIndex = Math.floor(Math.random() * RESPONSES.length);
		return RESPONSES[randomIndex];
	}
}
