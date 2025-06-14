import { Message } from 'discord.js';
import { matchesPattern } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { CHECK_BOT_PATTERNS, swapCheckAndCzech } from './constants';

// Trigger for check/czech mentions
export const checkTrigger = createTriggerResponse({
	name: 'check-trigger',
	condition: matchesPattern(CHECK_BOT_PATTERNS.Default),
	response: (message: Message) => {
		const swapped = swapCheckAndCzech(message.content);
		return `I believe you meant to say: '${swapped}'.`;
	},
	priority: 1
});
