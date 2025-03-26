import { matchesPattern } from '../../core/conditions';
import { staticResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { SIG_GREAT_BOT_PATTERNS, SIG_GREAT_BOT_RESPONSES } from './constants';

// Trigger for Sig praise
export const sigGreatTrigger = createTriggerResponse({
	name: 'sig-great-trigger',
	condition: matchesPattern(SIG_GREAT_BOT_PATTERNS.Default),
	response: staticResponse(SIG_GREAT_BOT_RESPONSES.Default),
	priority: 1
});
