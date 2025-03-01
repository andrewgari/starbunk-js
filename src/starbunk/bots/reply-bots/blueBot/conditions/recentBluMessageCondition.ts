import { botStateService } from "@/services/botStateService";
import { TriggerCondition } from "@/starbunk/bots/botTypes";
import { STATE_KEYS } from "../blueBotModel";

/**
 * Condition that checks if the bot recently said "Did somebody say Blu"
 * Specifically designed for follow-up responses
 */
export class RecentBluMessageCondition implements TriggerCondition {
	private readonly timeWindowMs: number;

	constructor(minutesWindow: number = 5) {
		// Convert minutes to milliseconds
		this.timeWindowMs = minutesWindow * 60 * 1000;
	}

	async shouldTrigger(): Promise<boolean> {
		// Get the timestamp of the last initial message
		const lastMessageTime = botStateService.getState<number>(STATE_KEYS.TIMESTAMP, 0);

		// If we've never sent the message or the timestamp is invalid, return false
		if (lastMessageTime === 0) return false;

		// Check if the message was sent within our time window
		const timeSinceMessage = Date.now() - lastMessageTime;
		return timeSinceMessage < this.timeWindowMs;
	}
}
