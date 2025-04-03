import { BotIdentity } from '@/starbunk/types/botIdentity';
import userId from '../../../../discord/userId';
import { getBotIdentityFromDiscord } from '../../core/get-bot-identity';
import { createTriggerResponse } from '../../core/trigger-response';
import { CHAD_BOT_NAME, CHAD_RESPONSE, CHAD_RESPONSE_CHANCE } from './constants';

// Get Chad's identity from Discord
async function getChadIdentity(): Promise<BotIdentity> {
	return getBotIdentityFromDiscord({
		userId: userId.Chad,
		fallbackName: CHAD_BOT_NAME
	});
}

// Chad bot trigger - 10% chance to respond, but always responds to the real Chad
export const chadKeywordTrigger = createTriggerResponse({
	name: 'chad-keyword-trigger',
	priority: 1,
	condition: (message) => {
		// Always respond to the real Chad
		if (message.author.id === userId.Chad) {
			return false;
		}

		// For everyone else, 10% chance to respond
		return Math.random() < CHAD_RESPONSE_CHANCE;
	},
	response: () => CHAD_RESPONSE,
	identity: getChadIdentity
});
