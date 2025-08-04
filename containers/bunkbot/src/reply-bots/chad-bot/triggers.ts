import { BotIdentity } from '../../types/botIdentity';
import { and, fromUser, not, withChance, matchesPattern } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { ConfigurationService } from '../../services/configurationService';
import { BotIdentityService } from '../../services/botIdentityService';
import { CHAD_BOT_NAME, CHAD_RESPONSE } from './constants';

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

// Chad bot trigger - responds to gym/protein/fitness keywords, but never responds to the real Chad
export const chadKeywordTrigger = createTriggerResponse({
	name: 'chad-keyword-trigger',
	priority: 1,
	condition: async (message) => {
		const chadUserId = await getChadUserId();
		if (!chadUserId) {
			return false; // Skip if Chad's user ID not found
		}

		// Check if message is not from Chad and contains fitness-related keywords
		const notFromChad = not(fromUser(chadUserId));
		// Match gym/protein/fitness keywords (case-insensitive)
		const keywordPattern = matchesPattern(/\b(gym|protein|gains|chad|workout|fitness|lifting|muscle|bulk|cut|rep|set)\b/i);
		const combinedCondition = and(notFromChad, keywordPattern);

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
