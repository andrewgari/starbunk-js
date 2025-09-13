import { and, matchesPattern } from '../../core/conditions';
import { getBotIdentityFromDiscord } from '../../core/get-bot-identity';
import { createTriggerResponse } from '../../core/trigger-response';
import { SIG_GREAT_BOT_PATTERN, SIG_GREAT_RESPONSE } from './constants';
import { Message } from 'discord.js';

// Get the poster's identity from Discord (impersonate the person who triggered it)
async function getPosterIdentity(message: Message) {
	// In E2E webhook tests, author is a webhook pseudo-user and not a real guild member.
	// Use configured E2E test member for identity so we can render a valid profile in debug.
	const e2eMemberId = process.env.E2E_TEST_MEMBER_ID || process.env.E2E_ID_SIGGREAT;
	const useE2EIdentity = Boolean(message.webhookId) && Boolean(e2eMemberId);

	return getBotIdentityFromDiscord({
		userId: useE2EIdentity ? (e2eMemberId as string) : message.author.id,
		fallbackName: 'SigGreatBot',
		message,
	});
}

// Pattern trigger - responds to specific patterns by impersonating the poster
export const sigGreatTrigger = createTriggerResponse({
	name: 'sig-great-trigger',
	priority: 1,
	condition: and(matchesPattern(SIG_GREAT_BOT_PATTERN)),
	response: () => SIG_GREAT_RESPONSE,
	identity: getPosterIdentity,
});
