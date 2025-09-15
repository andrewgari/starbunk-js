import { matchesPattern } from '../../core/conditions';
import { staticResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { CHAOS_BOT_PATTERNS, CHAOS_BOT_RESPONSES } from './constants';

// Trigger for chaos mentions
export const chaosTrigger = createTriggerResponse({
	name: 'chaos-trigger',
	condition: matchesPattern(CHAOS_BOT_PATTERNS.Default),
	response: staticResponse(CHAOS_BOT_RESPONSES.Default),
	priority: 1,
});
