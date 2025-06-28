import { and, matchesPattern } from '../../core/conditions';
import { getBotIdentityFromDiscord } from '../../core/get-bot-identity';
import { createTriggerResponse } from '../../core/trigger-response';
import { SIG_GREAT_BOT_PATTERN, SIG_GREAT_RESPONSE } from './constants';
import { Message } from 'discord.js';

// Get the poster's identity from Discord (impersonate the person who triggered it)
async function getPosterIdentity(message: Message) {
	return getBotIdentityFromDiscord({
		userId: message.author.id,
		fallbackName: 'SigGreatBot',
		message
	});
}

// Pattern trigger - responds to specific patterns by impersonating the poster
export const sigGreatTrigger = createTriggerResponse({
	name: 'sig-great-trigger',
	priority: 1,
	condition: and(
		matchesPattern(SIG_GREAT_BOT_PATTERN)
	),
	response: () => SIG_GREAT_RESPONSE,
	identity: getPosterIdentity
});
