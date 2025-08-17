import { createTriggerResponse } from '../../core/trigger-response';
import { matchesPattern } from '../../core/conditions';
import { CLANKER_BOT_PATTERNS, CLANKER_BOT_RESPONSES } from './constants';

export const clankerTrigger = createTriggerResponse({
	name: 'clanker-word-trigger',
	priority: 1,
	condition: matchesPattern(CLANKER_BOT_PATTERNS.ClankerWord),
	response: () => {
		const idx = Math.floor(Math.random() * CLANKER_BOT_RESPONSES.length);
		return CLANKER_BOT_RESPONSES[idx];
	},
});
