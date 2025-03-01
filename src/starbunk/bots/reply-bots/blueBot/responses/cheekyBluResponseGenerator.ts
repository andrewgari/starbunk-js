import { botStateService } from "@/services/botStateService";
import { ResponseGenerator } from "@/starbunk/bots/botTypes";
import { AVATAR_URLS, CHEEKY_RESPONSES, STATE_KEYS } from "../blueBotModel";

/**
 * Custom response generator for cheeky "Somebody definitely said blu" message
 */
export class CheekyBluResponseGenerator implements ResponseGenerator {
	async generateResponse(): Promise<string> {
		// Store the avatar used for this response
		botStateService.setState(STATE_KEYS.LAST_AVATAR, AVATAR_URLS.CHEEKY);

		// Select a random response from the array
		const randomIndex = Math.floor(Math.random() * CHEEKY_RESPONSES.length);
		return CHEEKY_RESPONSES[randomIndex];
	}
}
