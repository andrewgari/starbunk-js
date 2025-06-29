import { BotIdentity } from '../../types/botIdentity';
import { matchesPattern } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { ConfigurationService } from '../../services/configurationService';
import { BotIdentityService } from '../../services/botIdentityService';
import { GUY_BOT_NAME, GUY_BOT_PATTERNS, getRandomGuyResponse } from './constants';

// Initialize services
const configService = new ConfigurationService();
const identityService = new BotIdentityService(configService);

// Get Guy's identity using the identity service with message context
async function getGuyIdentity(message?: any): Promise<BotIdentity | null> {
	return identityService.getGuyIdentity(message);
}

// Trigger for guy mentions
export const guyTrigger = createTriggerResponse({
	name: 'guy-trigger',
	condition: matchesPattern(GUY_BOT_PATTERNS.Default),
	response: async () => getRandomGuyResponse(),
	identity: async (message) => {
		const identity = await getGuyIdentity(message);
		if (!identity) {
			// If identity cannot be resolved, prevent trigger execution
			throw new Error('Guy identity could not be resolved - bot will remain silent');
		}
		return identity;
	},
	priority: 1
});
