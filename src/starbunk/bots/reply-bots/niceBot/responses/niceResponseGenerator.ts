import { ResponseGenerator } from "@/starbunk/bots/botTypes";
import { NICE_BOT_RESPONSE } from "../niceBotModel";

/**
 * Response generator that provides the "Nice." response
 */
export class NiceResponseGenerator implements ResponseGenerator {
	async generateResponse(): Promise<string> {
		return NICE_BOT_RESPONSE;
	}
}
