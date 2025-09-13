import { matchesPattern } from '../../core/conditions';
import { staticResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { HOLD_PATTERN, HOLD_RESPONSE } from './constants';

// The Hold Bot trigger - matches the "Hold" pattern
export const holdTrigger = createTriggerResponse({
	name: 'hold-trigger',
	condition: matchesPattern(HOLD_PATTERN),
	response: staticResponse(HOLD_RESPONSE),
});
