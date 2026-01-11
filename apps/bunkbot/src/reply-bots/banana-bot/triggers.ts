import { isDebugMode } from '@starbunk/shared';
import { and, fromUser, matchesPattern, withChance } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { ConfigurationService } from '../../services/configuration-service';
import { BANANA_BOT_PATTERNS, getRandomBananaResponse } from './constants';

// Lazily create configuration service to avoid Prisma init at import time
function getConfigService(): ConfigurationService | null {
	try {
		return new ConfigurationService();
	} catch {
		return null;
	}
}

// Get target user ID based on debug mode (with safe fallbacks for E2E)
async function getTargetUserId(): Promise<string | null> {
	// In debug mode, prefer E2E test member ID if available
	if (isDebugMode() && (process.env.E2E_TEST_MEMBER_ID || process.env.E2E_ID_SIGGREAT)) {
		return (process.env.E2E_TEST_MEMBER_ID || process.env.E2E_ID_SIGGREAT) as string;
	}
	const cs = getConfigService();
	if (!cs) return null;
	const targetUsername = isDebugMode() ? 'Cova' : 'Venn';
	return cs.getUserIdByUsername(targetUsername);
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
	priority: 1,
});
