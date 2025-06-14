import { and, fromBot, withChance } from '../../core/conditions';
import { staticResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { BOT_BOT_RESPONSES, BOT_BOT_RESPONSE_RATE } from './constants';

// Trigger for bot messages with random chance
// Explicitly handle bot messages (including self) with fromBot(true)
export const botTrigger = createTriggerResponse({
	name: 'bot-trigger',
	condition: and(
		fromBot(true), // Include all bots, including self
		withChance(BOT_BOT_RESPONSE_RATE)
	),
	response: staticResponse(BOT_BOT_RESPONSES.Default),
	priority: 1
});
