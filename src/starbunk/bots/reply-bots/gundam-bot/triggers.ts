import { matchesPattern } from '../../core/conditions';
import { staticResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { GUNDAM_BOT_PATTERNS, GUNDAM_BOT_RESPONSES } from './constants';

// Trigger for Gundam mentions
export const gundamTrigger = createTriggerResponse({
	name: 'gundam-trigger',
	condition: matchesPattern(GUNDAM_BOT_PATTERNS.Default),
	response: staticResponse(GUNDAM_BOT_RESPONSES.Default),
	priority: 1
});
