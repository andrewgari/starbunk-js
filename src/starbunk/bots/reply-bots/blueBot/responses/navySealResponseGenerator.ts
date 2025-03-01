import { botStateService } from "@/services/botStateService";
import { ResponseGenerator } from "@/starbunk/bots/botTypes";
import { AVATAR_URLS, NAVY_SEAL_RESPONSE, STATE_KEYS } from "../blueBotModel";

/**
 * Custom response generator for Navy Seal copypasta
 */
export class NavySealResponseGenerator implements ResponseGenerator {
	async generateResponse(): Promise<string> {
		// Store the avatar used for this response
		botStateService.setState(STATE_KEYS.LAST_AVATAR, AVATAR_URLS.MURDER);
		return NAVY_SEAL_RESPONSE;
	}
}
