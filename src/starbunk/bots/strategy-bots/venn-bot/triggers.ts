import { Message } from 'discord.js';
import userId from '../../../../discord/userId';
import { getDiscordService } from '../../../../services/bootstrap';
import { logger } from '../../../../services/logger';
import { BotIdentity } from '../../../types/botIdentity';
import { and, fromUser, matchesPattern, withChance } from '../../core/conditions';
import { randomResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { VENN_BOT_NAME, VENN_PATTERNS, VENN_RESPONSE, VENN_RESPONSES, VENN_RESPONSE_RATE, VENN_TRIGGER_CHANCE, VENN_USER_ID } from './constants';

// Cache for Venn's avatar URL
let cachedAvatarUrl: string | null = null;

// Helper function to get Venn's identity
async function getVennIdentity(message: Message): Promise<BotIdentity> {
	// Return cached avatar if available
	if (cachedAvatarUrl) {
		return {
			botName: VENN_BOT_NAME,
			avatarUrl: cachedAvatarUrl
		};
	}

	try {
		// Try to fetch Venn's user
		const user = await message.client.users.fetch(VENN_USER_ID);
		if (user) {
			cachedAvatarUrl = user.displayAvatarURL({ extension: 'png', size: 128 });
			return {
				botName: VENN_BOT_NAME,
				avatarUrl: cachedAvatarUrl
			};
		}
	} catch (error) {
		logger.error(`Error fetching Venn's avatar:`, error as Error);
	}

	// Default fallback
	return {
		botName: VENN_BOT_NAME,
		avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png'
	};
}

// Trigger for cringe messages
export const cringeTrigger = createTriggerResponse({
	name: 'cringe-trigger',
	condition: matchesPattern(VENN_PATTERNS.Cringe),
	response: randomResponse(VENN_RESPONSES.Cringe),
	identity: getVennIdentity,
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
	identity: getVennIdentity,
	priority: 1
});

// Get Venn's identity from Discord
async function getVennIdentityFromDiscord() {
	const discordService = getDiscordService();
	return discordService.getMemberAsBotIdentity(userId.Venn);
}

// Random chance trigger - 1% chance to say "Hmm..."
export const vennTrigger = createTriggerResponse({
	name: 'venn-trigger',
	priority: 1,
	condition: withChance(VENN_TRIGGER_CHANCE),
	response: () => VENN_RESPONSE,
	identity: getVennIdentityFromDiscord
});
