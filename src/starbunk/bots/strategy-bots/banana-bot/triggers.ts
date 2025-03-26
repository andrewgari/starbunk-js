import { matchesPattern } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { BANANA_BOT_PATTERNS, getRandomBananaResponse } from './constants';

// Trigger for banana mentions
export const bananaTrigger = createTriggerResponse({
	name: 'banana-trigger',
	condition: matchesPattern(BANANA_BOT_PATTERNS.Default),
	response: async () => getRandomBananaResponse(),
	priority: 1
});
