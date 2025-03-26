import { matchesPattern } from '../../core/conditions';
import { staticResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { MACARONI_BOT_PATTERNS, MACARONI_BOT_RESPONSES } from './constants';

// Trigger for macaroni/pasta mentions
export const macaroniTrigger = createTriggerResponse({
	name: 'macaroni-trigger',
	condition: matchesPattern(MACARONI_BOT_PATTERNS.Macaroni),
	response: staticResponse(MACARONI_BOT_RESPONSES.Macaroni),
	priority: 1
});

// Trigger for Venn mentions
export const vennTrigger = createTriggerResponse({
	name: 'venn-trigger',
	condition: matchesPattern(MACARONI_BOT_PATTERNS.Venn),
	response: staticResponse(MACARONI_BOT_RESPONSES.Venn),
	priority: 1
});
