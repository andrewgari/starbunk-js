import { staticResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { BOT_BOT_RESPONSES } from './constants';

// Simplified trigger for bot messages
// The messageFilter now handles bot filtering and chance logic
// This trigger will only be reached for valid bot messages that passed the 1% chance
export const botTrigger = createTriggerResponse({
	name: 'bot-trigger',
	condition: () => true, // Always trigger since messageFilter handles all filtering
	response: staticResponse(BOT_BOT_RESPONSES.Default),
	priority: 1,
});
