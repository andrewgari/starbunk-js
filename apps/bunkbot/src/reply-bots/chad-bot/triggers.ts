import type { Message } from 'discord.js';

import { BotIdentity } from '../../types/botIdentity';
import { and, fromUser, not, withChance } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { ConfigurationService } from '../../services/configurationService';
import { BotIdentityService } from '../../services/botIdentityService';
import { CHAD_RESPONSE, CHAD_RESPONSE_CHANCE } from './constants';
import { isDebugMode } from '@starbunk/shared';
import { getBotIdentityFromDiscord } from '../../core/get-bot-identity';

// Lazily construct services to avoid Prisma at import time
function getIdentityService(): BotIdentityService | null {
	try {
		const cs = new ConfigurationService();
		return new BotIdentityService(cs);
	} catch {
		return null;
	}
}

// Get Chad's identity using the identity service with message context; fallback to E2E test member when available
async function getChadIdentity(message?: Message): Promise<BotIdentity | null> {
	const svc = getIdentityService();
	if (svc) {
		try {
			return await svc.getChadIdentity(message);
		} catch {}
	}
	const testId = (process.env.E2E_TEST_MEMBER_ID || process.env.E2E_ID_SIGGREAT) as string | undefined;
	if (isDebugMode() && testId) {
		return getBotIdentityFromDiscord({ userId: testId, fallbackName: 'Chad', message });
	}
	return null;
}

// Get Chad's user ID from configuration (debug fallback)
async function getChadUserId(): Promise<string | null> {
	if (isDebugMode() && (process.env.E2E_TEST_MEMBER_ID || process.env.E2E_ID_SIGGREAT)) {
		return (process.env.E2E_TEST_MEMBER_ID || process.env.E2E_ID_SIGGREAT) as string;
	}
	try {
		const cs = new ConfigurationService();
		return await cs.getUserIdByUsername('Chad');
	} catch {
		return null;
	}
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
