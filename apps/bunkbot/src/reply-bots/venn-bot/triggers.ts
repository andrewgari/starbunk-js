import type { Message } from 'discord.js';

import { BotIdentity } from '../../types/bot-identity';
import { and, fromUser, matchesPattern, or, withChance } from '../../core/conditions';
import { weightedRandomResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { ConfigurationService } from '../../services/configuration-service';
import { BotIdentityService } from '../../services/bot-identity-service';
import { VENN_BOT_NAME, VENN_PATTERNS, VENN_RESPONSES, VENN_TRIGGER_CHANCE } from './constants';
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

// Get Venn's identity using the identity service with message context; fallback to E2E test member when available
async function getVennIdentity(message?: Message): Promise<BotIdentity | null> {
	const svc = getIdentityService();
	if (svc) {
		try {
			return await svc.getVennIdentity(message);
		} catch {}
	}
	const testId = (process.env.E2E_TEST_MEMBER_ID || process.env.E2E_ID_SIGGREAT) as string | undefined;
	if (isDebugMode() && testId) {
		return getBotIdentityFromDiscord({ userId: testId, fallbackName: VENN_BOT_NAME, message });
	}
	return null;
}

// Get Venn's user ID from configuration (debug fallback)
async function getVennUserId(): Promise<string | null> {
	if (isDebugMode() && (process.env.E2E_TEST_MEMBER_ID || process.env.E2E_ID_SIGGREAT)) {
		return (process.env.E2E_TEST_MEMBER_ID || process.env.E2E_ID_SIGGREAT) as string;
	}
	try {
		const cs = new ConfigurationService();
		return await cs.getUserIdByUsername('Venn');
	} catch {
		return null;
	}
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
	priority: 2,
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
			withChance(VENN_TRIGGER_CHANCE), // 1% chance to trigger
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
	priority: 1,
});
