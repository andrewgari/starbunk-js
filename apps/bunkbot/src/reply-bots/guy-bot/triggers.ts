import type { Message } from 'discord.js';

import { BotIdentity } from '../../types/botIdentity';
import { matchesPattern } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { ConfigurationService } from '../../services/configurationService';
import { BotIdentityService } from '../../services/botIdentityService';
import { GUY_BOT_PATTERNS, getRandomGuyResponse } from './constants';
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

// Get Guy's identity using the identity service with message context; fallback to E2E test member when available
async function getGuyIdentity(message?: Message): Promise<BotIdentity | null> {
	const svc = getIdentityService();
	if (svc) {
		try {
			return await svc.getGuyIdentity(message);
		} catch {}
	}
	const testId = (process.env.E2E_TEST_MEMBER_ID || process.env.E2E_ID_SIGGREAT) as string | undefined;
	if (isDebugMode() && testId) {
		return getBotIdentityFromDiscord({ userId: testId, fallbackName: 'Guy', message });
	}
	return null;
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
	priority: 1,
});
