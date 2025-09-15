import { Message } from 'discord.js';
import { matchesPattern } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { EZIO_BOT_PATTERNS } from './constants';

// Trigger for Ezio/Assassin mentions
export const ezioTrigger = createTriggerResponse({
	name: 'ezio-trigger',
	condition: matchesPattern(EZIO_BOT_PATTERNS.Default),
	response: (message: Message) => {
		const name = message.author.displayName;
		return `Remember ${name}, Nothing is true; Everything is permitted.`;
	},
	priority: 1,
});
