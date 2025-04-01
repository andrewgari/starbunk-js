import userId from '../../../../discord/userId';
import { getDiscordService } from '../../../../services/bootstrap';
import { withChance } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { SIG_GREAT_CHANCE, SIG_GREAT_RESPONSE } from './constants';

// Get Sig's identity from Discord
async function getSigIdentity() {
	try {
		const discordService = getDiscordService();
		const identity = await discordService.getMemberAsBotIdentity(userId.Sig);
		
		// Validate identity
		if (!identity || !identity.botName || !identity.avatarUrl) {
			throw new Error('Invalid bot identity retrieved for Sig');
		}
		
		return identity;
	} catch (error) {
		console.error(`Error getting Sig's identity from Discord:`, error instanceof Error ? error : new Error(String(error)));
		
		// Fallback to a valid default identity
		return {
			botName: 'SigGreatBot',
			avatarUrl: 'https://cdn.discordapp.com/embed/avatars/2.png'
		};
	}
}

// Random chance trigger - 1% chance to say "Great!"
export const sigGreatTrigger = createTriggerResponse({
	name: 'sig-great-trigger',
	priority: 1,
	condition: withChance(SIG_GREAT_CHANCE),
	response: () => SIG_GREAT_RESPONSE,
	identity: getSigIdentity
});
