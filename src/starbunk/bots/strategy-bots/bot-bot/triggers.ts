import { and, fromBot, withChance } from '../../core/conditions';
import { staticResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { BOT_BOT_RESPONSES, BOT_BOT_RESPONSE_RATE } from './constants';

// Trigger for bot messages with random chance
// Explicitly set includeSelf to false to prevent responding to self
export const botTrigger = createTriggerResponse({
	name: 'bot-trigger',
	condition: and(
		fromBot(true), // Don't respond to itself
		withChance(BOT_BOT_RESPONSE_RATE)
	),
	response: staticResponse(BOT_BOT_RESPONSES.Default),
	priority: 1
});
