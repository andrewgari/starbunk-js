import { isDebugMode } from '@starbunk/shared';

// Simple user IDs for testing and development
const userId = {
	Cova: '139592376443338752', // Cova's actual Discord user ID
	Venn: '123456789012345678' // Valid format placeholder for Venn
};
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
