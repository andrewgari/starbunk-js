import { matchesPattern } from '../../core/conditions';
import { staticResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { PICKLE_BOT_PATTERNS, PICKLE_BOT_RESPONSES } from './constants';

// Trigger for gremlin mentions
export const pickleTrigger = createTriggerResponse({
	name: 'pickle-trigger',
	condition: matchesPattern(PICKLE_BOT_PATTERNS.Default),
	response: staticResponse(PICKLE_BOT_RESPONSES.Default),
	priority: 1,
});
