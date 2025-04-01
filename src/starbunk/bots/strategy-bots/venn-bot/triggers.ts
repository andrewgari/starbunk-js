import userId from '../../../../discord/userId';
import { BotIdentity } from '../../../types/botIdentity';
import { and, fromUser, matchesPattern, withChance } from '../../core/conditions';
import { getBotIdentityFromDiscord } from '../../core/get-bot-identity';
import { randomResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { VENN_BOT_NAME, VENN_PATTERNS, VENN_RESPONSES, VENN_RESPONSE_RATE, VENN_USER_ID } from './constants';

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
	response: randomResponse(VENN_RESPONSES.Cringe),
	identity: getVennIdentityFromDiscord,
	priority: 2
});

// Random trigger for Venn's messages
export const randomVennTrigger = createTriggerResponse({
	name: 'random-venn-trigger',
	condition: and(
		fromUser(VENN_USER_ID),
		withChance(VENN_RESPONSE_RATE)
	),
	response: randomResponse(VENN_RESPONSES.Cringe),
	identity: getVennIdentityFromDiscord,
	priority: 1
});

