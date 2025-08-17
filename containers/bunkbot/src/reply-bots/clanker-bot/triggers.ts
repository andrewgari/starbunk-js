import { createTriggerResponse } from '../../core/trigger-response';
import { matchesPattern } from '../../core/conditions';
import { CLANKER_BOT_PATTERNS, CLANKER_BOT_RESPONSES } from './constants';

export const clankerTrigger = createTriggerResponse({
	name: 'clanker-word-trigger',
	priority: 1,
	condition: matchesPattern(CLANKER_BOT_PATTERNS.ClankerWord),
response: () => {
    const { length } = CLANKER_BOT_RESPONSES;
    if (length === 0) {
        // Safe fallback if misconfigured; alternatively, throw a typed error if preferred.
        return 'Statement: Insult detected. Configuration missing responses.';
    }
    const idx = Math.floor(Math.random() * length);
    return CLANKER_BOT_RESPONSES[idx];
},
});
