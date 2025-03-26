import { Message } from 'discord.js';
import { logger } from '../../../../services/logger';
import { withChance } from '../../core/conditions';
import { randomResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { 
	CHAD_AVATAR_URL, 
	CHAD_BOT_NAME,
	CHAD_RESPONSES,
	CHAD_SPECIFIC_PHRASES,
	CHAD_TRIGGER_REGEX
} from './constants';

// Trigger for when a message contains a chad-related word
export const chadWordTrigger = createTriggerResponse({
	name: 'chad-word-trigger',
	priority: 2,
	condition: (message: Message): boolean => {
		// Only proceed if message content exists
		if (!message.content) return false;
		
		// Check if message matches regex pattern
		const matchesRegex = CHAD_TRIGGER_REGEX.test(message.content.toLowerCase());
		if (matchesRegex) {
			logger.debug(`[ChadBot] Message matched regex trigger: "${message.content.substring(0, 100)}..."`);
			return true;
		}
		
		return false;
	},
	// Random response from the chad responses array
	response: randomResponse(CHAD_RESPONSES),
	// Standard chad identity 
	identity: {
		botName: CHAD_BOT_NAME,
		avatarUrl: CHAD_AVATAR_URL
	}
});

// Trigger for when a message contains a specific chad-related phrase
export const chadPhraseTrigger = createTriggerResponse({
	name: 'chad-phrase-trigger',
	priority: 3,
	condition: (message: Message): boolean => {
		// Only proceed if message content exists
		if (!message.content) return false;
		
		// Check if message contains any of the specific phrases
		const lowerContent = message.content.toLowerCase();
		
		for (const phrase of CHAD_SPECIFIC_PHRASES) {
			if (lowerContent.includes(phrase.toLowerCase())) {
				logger.debug(`[ChadBot] Message matched phrase: "${phrase}"`);
				return true;
			}
		}
		
		return false;
	},
	// Random response with the chance defined in constants
	response: randomResponse(CHAD_RESPONSES),
	// Standard chad identity
	identity: {
		botName: CHAD_BOT_NAME,
		avatarUrl: CHAD_AVATAR_URL
	}
});

// Random chance trigger - very low probability to just randomly respond
export const chadRandomTrigger = createTriggerResponse({
	name: 'chad-random-trigger',
	priority: 1, // Lower priority than specific triggers
	// 0.5% random chance to trigger on any message
	condition: withChance(0.5),
	// Random response from the array
	response: randomResponse(CHAD_RESPONSES),
	// Standard chad identity
	identity: {
		botName: CHAD_BOT_NAME,
		avatarUrl: CHAD_AVATAR_URL
	}
});
