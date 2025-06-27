import { BotIdentity } from '../../types/botIdentity';
import { matchesPattern } from '../../core/conditions';
import { getBotIdentityFromDiscord } from '../../core/get-bot-identity';
import { createTriggerResponse } from '../../core/trigger-response';
import { GUY_BOT_NAME, GUY_BOT_PATTERNS, getRandomGuyResponse } from './constants';

// Guy's real Discord user ID
const GUY_USER_ID = '135820819086573568';

// Get Guy's identity from Discord
async function getGuyIdentityFromDiscord(): Promise<BotIdentity> {
	return getBotIdentityFromDiscord({
		userId: GUY_USER_ID,
		fallbackName: GUY_BOT_NAME
	});
}

// Trigger for guy mentions
export const guyTrigger = createTriggerResponse({
	name: 'guy-trigger',
	condition: matchesPattern(GUY_BOT_PATTERNS.Default),
	response: async () => getRandomGuyResponse(),
	identity: async () => getGuyIdentityFromDiscord(),
	priority: 1
});
