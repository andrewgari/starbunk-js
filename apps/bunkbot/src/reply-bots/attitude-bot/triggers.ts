import { matchesPattern } from '../../core/conditions';
import { staticResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { ATTITUDE_BOT_PATTERNS, ATTITUDE_BOT_RESPONSES } from './constants';

// Trigger for negative attitude statements
export const attitudeTrigger = createTriggerResponse({
	name: 'attitude-trigger',
	condition: matchesPattern(ATTITUDE_BOT_PATTERNS.Default),
	response: staticResponse(ATTITUDE_BOT_RESPONSES.Default),
	priority: 1,
});
