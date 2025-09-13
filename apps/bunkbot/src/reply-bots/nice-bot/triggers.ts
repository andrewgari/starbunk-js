import { matchesPattern } from '../../core/conditions';
import { staticResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { NICE_BOT_PATTERNS, NICE_BOT_RESPONSES } from './constants';

// Trigger for "nice" responses
export const niceTrigger = createTriggerResponse({
	name: 'nice-trigger',
	condition: matchesPattern(NICE_BOT_PATTERNS.Default),
	response: staticResponse(NICE_BOT_RESPONSES.Default),
	priority: 1,
});
