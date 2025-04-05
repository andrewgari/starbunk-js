import userId from '@/discord/userId';
import { BotIdentity } from '@/starbunk/types/botIdentity';
import { and, fromUser, matchesPattern, or, withChance } from '../../core/conditions';
import { getBotIdentityFromDiscord } from '../../core/get-bot-identity';
import { createTriggerResponse } from '../../core/trigger-response';
import { GUY_BOT_NAME, GUY_BOT_PATTERNS, GUY_TRIGGER_CHANCE, getRandomGuyResponse } from './constants';

// Get Guy's identity from Discord
async function getGuyIdentityFromDiscord(): Promise<BotIdentity> {
	return getBotIdentityFromDiscord({
		userId: userId.Guy,
		fallbackName: GUY_BOT_NAME
	});
}

// Trigger for guy mentions or Guy's messages
export const guyTrigger = createTriggerResponse({
	name: 'guy-trigger',
	condition: or(
		matchesPattern(GUY_BOT_PATTERNS.Default),
		and(fromUser(userId.Guy), withChance(GUY_TRIGGER_CHANCE))
	),
	response: async () => getRandomGuyResponse(),
	identity: async () => getGuyIdentityFromDiscord(),
	priority: 1
});
