import { and, fromBotExcludingCovaBot, withChance } from '../../core/conditions';
import { staticResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { BOT_BOT_RESPONSES, BOT_BOT_RESPONSE_RATE } from './constants';

// Trigger for bot messages with random chance
// Uses enhanced bot filtering to exclude CovaBot and other specified bots
// This prevents BotBot from responding to CovaBot messages
export const botTrigger = createTriggerResponse({
	name: 'bot-trigger',
	condition: and(
		fromBotExcludingCovaBot(), // Exclude CovaBot and other specified bots
		withChance(BOT_BOT_RESPONSE_RATE)
	),
	response: staticResponse(BOT_BOT_RESPONSES.Default),
	priority: 1
});
