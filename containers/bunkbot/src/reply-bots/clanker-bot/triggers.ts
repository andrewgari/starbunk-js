import { createTriggerResponse } from '../../core/trigger-response';
import { matchesPattern } from '../../core/conditions';
import { CLANKER_BOT_RESPONSES, CLANKER_BOT_PATTERNS } from './constants';

export const clankerTrigger = createTriggerResponse({
	name: 'clanker-word-trigger',
	priority: 1,
	condition: matchesPattern(CLANKER_BOT_PATTERNS.ClankerWord),
	response: () => CLANKER_BOT_RESPONSES[Math.floor(Math.random() * CLANKER_BOT_RESPONSES.length)],
});
