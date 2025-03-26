import { matchesPattern } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { GUY_BOT_PATTERNS, getRandomGuyResponse } from './constants';

// Trigger for guy mentions
export const guyTrigger = createTriggerResponse({
	name: 'guy-trigger',
	condition: matchesPattern(GUY_BOT_PATTERNS.Default),
	response: async () => getRandomGuyResponse(),
	priority: 1
});
