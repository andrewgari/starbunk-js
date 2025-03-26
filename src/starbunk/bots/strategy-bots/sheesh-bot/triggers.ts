import { matchesPattern } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { SHEESH_BOT_PATTERNS, generateSheeshResponse } from './constants';

// Trigger for sheesh mentions
export const sheeshTrigger = createTriggerResponse({
	name: 'sheesh-trigger',
	condition: matchesPattern(SHEESH_BOT_PATTERNS.Default),
	response: async () => generateSheeshResponse(),
	priority: 1
});
