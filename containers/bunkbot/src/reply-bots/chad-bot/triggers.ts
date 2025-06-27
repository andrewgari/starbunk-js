import { BotIdentity } from '../../types/botIdentity';
import { and, fromUser, not, withChance } from '../../core/conditions';
import { getBotIdentityFromDiscord } from '../../core/get-bot-identity';
import { createTriggerResponse } from '../../core/trigger-response';
import { CHAD_BOT_NAME, CHAD_RESPONSE, CHAD_RESPONSE_CHANCE, CHAD_USER_ID } from './constants';

// Get Chad's identity from Discord
async function getChadIdentity(): Promise<BotIdentity> {
	return getBotIdentityFromDiscord({
		userId: CHAD_USER_ID,
		fallbackName: CHAD_BOT_NAME,
	});
}

// Chad bot trigger - 1% chance to respond, but never responds to the real Chad
export const chadKeywordTrigger = createTriggerResponse({
	name: 'chad-keyword-trigger',
	priority: 1,
	condition: and(not(fromUser(CHAD_USER_ID)), withChance(CHAD_RESPONSE_CHANCE)),
	response: () => CHAD_RESPONSE,
	identity: getChadIdentity,
});
