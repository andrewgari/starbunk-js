import userId from '../../../../discord/userId';
import { getDiscordService } from '../../../../services/bootstrap';
import { withChance } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { SIG_GREAT_CHANCE, SIG_GREAT_RESPONSE } from './constants';

// Get Sig's identity from Discord
async function getSigIdentity() {
	const discordService = getDiscordService();
	return discordService.getMemberAsBotIdentity(userId.Sig);
}

// Random chance trigger - 1% chance to say "Great!"
export const sigGreatTrigger = createTriggerResponse({
	name: 'sig-great-trigger',
	priority: 1,
	condition: withChance(SIG_GREAT_CHANCE),
	response: () => SIG_GREAT_RESPONSE,
	identity: getSigIdentity
});
