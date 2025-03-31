import userId from '../../../../discord/userId';
import { isDebugMode } from '../../../../environment';
import { and, fromUser, matchesPattern, or, withChance } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { BANANA_BOT_PATTERNS, getRandomBananaResponse } from './constants';

// if the message contains the word banana OR if venn says anything there's a 10% chance that the bot will respond
// the bot will respond with a random banana related response

// In debug mode, use Cova's ID instead of Venn's for easier testing
const targetUserId = isDebugMode() ? userId.Cova : userId.Venn;

// Trigger for banana mentions or target user's messages
export const bananaTrigger = createTriggerResponse({
	name: 'banana-trigger',
	condition: or(
		matchesPattern(BANANA_BOT_PATTERNS.Default),
		and(fromUser(targetUserId), withChance(10))
	),
	response: async () => getRandomBananaResponse(),
	priority: 1
});
