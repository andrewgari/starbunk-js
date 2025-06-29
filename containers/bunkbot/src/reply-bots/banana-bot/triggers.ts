import { isDebugMode } from '@starbunk/shared';
import { and, fromUser, matchesPattern, or, withChance } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { ConfigurationService } from '../../services/configurationService';
import { BANANA_BOT_PATTERNS, getRandomBananaResponse } from './constants';

// Initialize configuration service
const configService = new ConfigurationService();

// Get target user ID based on debug mode
async function getTargetUserId(): Promise<string | null> {
	// In debug mode, use Cova's ID instead of Venn's for easier testing
	const targetUsername = isDebugMode() ? 'Cova' : 'Venn';
	return configService.getUserIdByUsername(targetUsername);
}

// Trigger for banana mentions or target user's messages
export const bananaTrigger = createTriggerResponse({
	name: 'banana-trigger',
	condition: async (message) => {
		// Always trigger on banana pattern
		const bananaPattern = matchesPattern(BANANA_BOT_PATTERNS.Default);
		if (bananaPattern(message)) {
			return true;
		}

		// Also trigger on target user's messages with 10% chance
		const targetUserId = await getTargetUserId();
		if (targetUserId) {
			const userMessageWithChance = and(fromUser(targetUserId), withChance(10));
			return userMessageWithChance(message);
		}

		return false;
	},
	response: async () => getRandomBananaResponse(),
	priority: 1
});
