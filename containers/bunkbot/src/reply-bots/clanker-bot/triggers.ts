import { createTriggerResponse } from '../../core/trigger-response';
import { matchesPattern } from '../../core/conditions';
import { CLANKER_BOT_PATTERNS, CLANKER_BOT_NEGATIVE_RESPONSE } from './constants';

export const clankerTrigger = createTriggerResponse({
	name: 'clanker-word-trigger',
	priority: 1,
	condition: matchesPattern(CLANKER_BOT_PATTERNS.ClankerWord),
	response: () => CLANKER_BOT_NEGATIVE_RESPONSE,
});
