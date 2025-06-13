import { and, matchesPattern } from '../../core/conditions';
import { getBotIdentityFromDiscord } from '../../core/get-bot-identity';
import { createTriggerResponse } from '../../core/trigger-response';
import { SIG_GREAT_BOT_PATTERN, SIG_GREAT_RESPONSE } from './constants';

// Get Sig's identity from Discord
async function getSigIdentity() {
	return getBotIdentityFromDiscord({
		useRandomMember: true,
		fallbackName: 'SigGreatBot',
		fallbackAvatarUrl: 'https://cdn.discordapp.com/embed/avatars/2.png'
	});
}

// Random chance trigger - 1% chance to say "Great!"
export const sigGreatTrigger = createTriggerResponse({
	name: 'sig-great-trigger',
	priority: 1,
	condition: and(
		matchesPattern(SIG_GREAT_BOT_PATTERN)
	),
	response: () => SIG_GREAT_RESPONSE,
	identity: getSigIdentity
});
