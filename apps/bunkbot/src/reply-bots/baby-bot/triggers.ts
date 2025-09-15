import { matchesPattern } from '../../core/conditions';
import { staticResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { BABY_BOT_PATTERNS, BABY_BOT_RESPONSES } from './constants';

// Trigger for "baby" mentions
export const babyTrigger = createTriggerResponse({
	name: 'baby-trigger',
	condition: matchesPattern(BABY_BOT_PATTERNS.Default),
	response: staticResponse(BABY_BOT_RESPONSES.Default),
	priority: 1,
});
