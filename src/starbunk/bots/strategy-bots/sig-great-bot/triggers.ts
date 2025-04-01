import { withChance } from '../../core/conditions';
import { getBotIdentityFromDiscord } from '../../core/get-bot-identity';
import { createTriggerResponse } from '../../core/trigger-response';
import { SIG_GREAT_CHANCE, SIG_GREAT_RESPONSE } from './constants';

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
	condition: withChance(SIG_GREAT_CHANCE),
	response: () => SIG_GREAT_RESPONSE,
	identity: getSigIdentity
});
