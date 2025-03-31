import userId from '../../../../discord/userId';
import { getDiscordService } from '../../../../services/bootstrap';
import { withChance } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { CHAD_RESPONSE, CHAD_TRIGGER_CHANCE } from './constants';

// Get Chad's identity from Discord
async function getChadIdentity() {
	const discordService = getDiscordService();
	return discordService.getMemberAsBotIdentity(userId.Chad);
}

// Random chance trigger - 1% chance to respond to any message
export const chadRandomTrigger = createTriggerResponse({
	name: 'chad-random-trigger',
	priority: 1,
	condition: withChance(CHAD_TRIGGER_CHANCE),
	response: () => CHAD_RESPONSE,
	identity: getChadIdentity
});
