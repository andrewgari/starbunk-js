import userID from "@/discord/userID";
import { botStateService } from "@/services/botStateService";
import { BotIdentity } from "@/starbunk/bots/botTypes";
import { CooldownCondition } from "@/starbunk/bots/triggers/conditions/cooldownCondition";
import { Patterns } from "@/starbunk/bots/triggers/conditions/patterns";
import { Message } from "discord.js";
import { AVATAR_URLS, STATE_KEYS } from "../blueBotModel";
import { RecentBluMessageCondition } from "../conditions/recentBluMessageCondition";

/**
 * Custom identity updater for BlueBot
 * This ensures the correct avatar is used for each condition, even if no response is sent
 */
export async function updateBlueBotIdentity(message: Message): Promise<BotIdentity> {
	// Default identity values
	const defaultName = 'BlueBot';
	const defaultAvatarUrl = AVATAR_URLS.DEFAULT;

	// Check for Venn's mean messages about blue
	if (message.author.id === userID.Venn &&
		message.content.match(Patterns.WORD_BLUE) &&
		message.content.match(Patterns.BLUEBOT_MEAN_WORDS)) {

		const recentBluMessage = await new RecentBluMessageCondition(5).shouldTrigger();
		const cooldownOff = await new CooldownCondition(24 * 60, "BlueBot_NavySeal").shouldTrigger();

		if (recentBluMessage && cooldownOff) {
			// Store the avatar used for this condition
			botStateService.setState(STATE_KEYS.LAST_AVATAR, AVATAR_URLS.MURDER);
			return {
				name: defaultName,
				avatarUrl: AVATAR_URLS.MURDER
			};
		}
	}

	// Check for acknowledgment messages within time window
	if (message.content.match(Patterns.BLUEBOT_ACKNOWLEDGMENT)) {
		const recentBluMessage = await new RecentBluMessageCondition(5).shouldTrigger();
		if (recentBluMessage) {
			// Store the avatar used for this condition
			botStateService.setState(STATE_KEYS.LAST_AVATAR, AVATAR_URLS.CHEEKY);
			return {
				name: defaultName,
				avatarUrl: AVATAR_URLS.CHEEKY
			};
		}
	}

	// Check for "blu" messages within time window
	if (message.content.match(Patterns.WORD_BLUE)) {
		const recentBluMessage = await new RecentBluMessageCondition(5).shouldTrigger();
		if (recentBluMessage) {
			// Store the avatar used for this condition
			botStateService.setState(STATE_KEYS.LAST_AVATAR, AVATAR_URLS.CHEEKY);
			return {
				name: defaultName,
				avatarUrl: AVATAR_URLS.CHEEKY
			};
		}
	}

	// Check for "say something nice about Venn" messages
	if (message.content.match(Patterns.BLUEBOT_NICE_REQUEST_VENN)) {
		// Store the avatar used for this condition
		botStateService.setState(STATE_KEYS.LAST_AVATAR, AVATAR_URLS.MEAN);
		return {
			name: defaultName,
			avatarUrl: AVATAR_URLS.MEAN
		};
	}

	// Check for "say something nice about X" messages
	if (message.content.match(Patterns.BLUEBOT_NICE_REQUEST_NAMED)) {
		// Store the avatar used for this condition
		botStateService.setState(STATE_KEYS.LAST_AVATAR, AVATAR_URLS.DEFAULT);
		return {
			name: defaultName,
			avatarUrl: AVATAR_URLS.DEFAULT
		};
	}

	// Use the last avatar if available, otherwise use default
	const lastAvatar = botStateService.getState<string>(STATE_KEYS.LAST_AVATAR, defaultAvatarUrl);
	return {
		name: defaultName,
		avatarUrl: lastAvatar
	};
}
