import { ResponseGenerator } from "@/starbunk/bots/botTypes";
import { HOLD_BOT_RESPONSE } from "../holdBotModel";

/**
 * Response generator that provides the "Hold." response
 */
export class HoldResponseGenerator implements ResponseGenerator {
	async generateResponse(): Promise<string> {
		return HOLD_BOT_RESPONSE;
	}
}
