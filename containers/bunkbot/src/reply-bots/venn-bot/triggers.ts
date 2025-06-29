import { BotIdentity } from '../../types/botIdentity';
import { and, fromUser, matchesPattern, or, withChance } from '../../core/conditions';
import { weightedRandomResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { ConfigurationService } from '../../services/configurationService';
import { BotIdentityService } from '../../services/botIdentityService';
import { VENN_BOT_NAME, VENN_PATTERNS, VENN_RESPONSES, VENN_TRIGGER_CHANCE } from './constants';

// Initialize services
const configService = new ConfigurationService();
const identityService = new BotIdentityService(configService);

// Get Venn's identity using the identity service with message context
async function getVennIdentity(message?: any): Promise<BotIdentity | null> {
	return identityService.getVennIdentity(message);
}

// Get Venn's user ID from configuration
async function getVennUserId(): Promise<string | null> {
	return configService.getUserIdByUsername('Venn');
}

// Trigger for cringe messages
export const cringeTrigger = createTriggerResponse({
	name: 'cringe-trigger',
	condition: matchesPattern(VENN_PATTERNS.Cringe),
	response: weightedRandomResponse(VENN_RESPONSES.Cringe),
	identity: async (message) => {
		const identity = await getVennIdentity(message);
		if (!identity) {
			// If identity cannot be resolved, prevent trigger execution
			throw new Error('Venn identity could not be resolved - bot will remain silent');
		}
		return identity;
	},
	priority: 2
});

// Random trigger for Venn's messages
export const randomVennTrigger = createTriggerResponse({
	name: 'random-venn-trigger',
	condition: async (message) => {
		const vennUserId = await getVennUserId();
		if (!vennUserId) {
			// If Venn's user ID not found, only trigger on cringe patterns
			return matchesPattern(VENN_PATTERNS.Cringe)(message);
		}

		// Original logic: trigger on Venn's messages with chance OR cringe patterns
		const vennMessageWithChance = and(
			fromUser(vennUserId),
			withChance(VENN_TRIGGER_CHANCE) // 1% chance to trigger
		);
		const cringePattern = matchesPattern(VENN_PATTERNS.Cringe);
		const combinedCondition = or(vennMessageWithChance, cringePattern);

		return combinedCondition(message);
	},
	response: weightedRandomResponse(VENN_RESPONSES.Cringe),
	identity: async (message) => {
		const identity = await getVennIdentity(message);
		if (!identity) {
			// If identity cannot be resolved, prevent trigger execution
			throw new Error('Venn identity could not be resolved - bot will remain silent');
		}
		return identity;
	},
	priority: 1
});

