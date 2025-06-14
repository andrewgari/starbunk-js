import userId from '../../../../discord/userId';
import { BotIdentity } from '../../../types/botIdentity';
import { and, fromUser, matchesPattern, or, withChance } from '../../core/conditions';
import { getBotIdentityFromDiscord } from '../../core/get-bot-identity';
import { weightedRandomResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { VENN_BOT_NAME, VENN_PATTERNS, VENN_RESPONSES, VENN_TRIGGER_CHANCE, VENN_USER_ID } from './constants';

// Get Venn's identity from Discord
async function getVennIdentityFromDiscord(): Promise<BotIdentity> {
	return getBotIdentityFromDiscord({
		userId: userId.Venn,
		fallbackName: VENN_BOT_NAME
	});
}

// Trigger for cringe messages
export const cringeTrigger = createTriggerResponse({
	name: 'cringe-trigger',
	condition: matchesPattern(VENN_PATTERNS.Cringe),
	response: weightedRandomResponse(VENN_RESPONSES.Cringe),
	identity: getVennIdentityFromDiscord,
	priority: 2
});

// Random trigger for Venn's messages
export const randomVennTrigger = createTriggerResponse({
	name: 'random-venn-trigger',
	condition: or(
		and(
			fromUser(VENN_USER_ID),
			withChance(VENN_TRIGGER_CHANCE) // 1% chance to trigger
		),
		matchesPattern(VENN_PATTERNS.Cringe)
	),
	response: weightedRandomResponse(VENN_RESPONSES.Cringe),
	identity: getVennIdentityFromDiscord,
	priority: 1
});

