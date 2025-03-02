import { botStateService } from "@/services/botStateService";
import { ResponseGenerator } from "@/starbunk/bots/botTypes";
import { AVATAR_URLS, DEFAULT_RESPONSES, STATE_KEYS } from "../blueBotModel";

/**
 * Custom response generator for the initial "Did somebody say Blu" message
 * Records the timestamp when this message was sent
 */
export class InitialBluResponseGenerator implements ResponseGenerator {
	async generateResponse(): Promise<string> {
		// Record the timestamp when this message was sent
		botStateService.setState(STATE_KEYS.TIMESTAMP, Date.now());
		// Store the avatar used for this response
		botStateService.setState(STATE_KEYS.LAST_AVATAR, AVATAR_URLS.DEFAULT);
		return DEFAULT_RESPONSES.INITIAL;
	}
}
