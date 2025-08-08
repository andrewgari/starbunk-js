import { BotIdentity } from '../../types/botIdentity';
import { and, fromUser, not, withChance } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { ConfigurationService } from '../../services/configurationService';
import { BotIdentityService } from '../../services/botIdentityService';
import { CHAD_RESPONSE, CHAD_RESPONSE_CHANCE } from './constants';

// Initialize services
const configService = new ConfigurationService();
const identityService = new BotIdentityService(configService);

// Get Chad's identity using the identity service with message context
async function getChadIdentity(message?: any): Promise<BotIdentity | null> {
	return identityService.getChadIdentity(message);
}

// Get Chad's user ID from configuration
async function getChadUserId(): Promise<string | null> {
	return configService.getUserIdByUsername('Chad');
}

// Chad bot trigger - 1% chance to respond, but never responds to the real Chad
export const chadKeywordTrigger = createTriggerResponse({
	name: 'chad-keyword-trigger',
	priority: 1,
	condition: async (message) => {
		const chadUserId = await getChadUserId();
		if (!chadUserId) {
			return false; // Skip if Chad's user ID not found
		}

		// Check if message is not from Chad and passes chance check
		const notFromChad = not(fromUser(chadUserId));
		const chanceCheck = withChance(CHAD_RESPONSE_CHANCE);
		const combinedCondition = and(notFromChad, chanceCheck);

		return combinedCondition(message);
	},
	response: () => CHAD_RESPONSE,
	identity: async (message) => {
		const identity = await getChadIdentity(message);
		if (!identity) {
			// If identity cannot be resolved, prevent trigger execution
			throw new Error('Chad identity could not be resolved - bot will remain silent');
		}
		return identity;
	},
});
