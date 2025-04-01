import userId from '../../../../discord/userId';
import { getDiscordService } from '../../../../services/bootstrap';
import { withChance } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { CHAD_RESPONSE, CHAD_TRIGGER_CHANCE } from './constants';

// Get Chad's identity from Discord
async function getChadIdentity() {
	try {
		const discordService = getDiscordService();
		const identity = await discordService.getMemberAsBotIdentity(userId.Chad);
		
		// Validate identity
		if (!identity || !identity.botName || !identity.avatarUrl) {
			throw new Error('Invalid bot identity retrieved for Chad');
		}
		
		return identity;
	} catch (error) {
		console.error(`Error getting Chad's identity from Discord:`, error instanceof Error ? error : new Error(String(error)));
		
		// Fallback to a valid default identity
		return {
			botName: 'Chad',
			avatarUrl: 'https://cdn.discordapp.com/embed/avatars/1.png'
		};
	}
}

// Random chance trigger - 1% chance to respond to any message
export const chadRandomTrigger = createTriggerResponse({
	name: 'chad-random-trigger',
	priority: 1,
	condition: withChance(CHAD_TRIGGER_CHANCE),
	response: () => CHAD_RESPONSE,
	identity: getChadIdentity
});
