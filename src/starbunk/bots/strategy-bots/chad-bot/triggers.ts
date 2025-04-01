// Import conditions core functionality but not using withChance
import {} from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { CHAD_BOT_NAME, CHAD_BOT_AVATAR_URL, CHAD_PATTERNS, CHAD_RESPONSES } from './constants';
import { randomElement } from '../../../../utils/random';

// Fixed bot identity
function getChadIdentity() {
	return {
		botName: CHAD_BOT_NAME,
		avatarUrl: CHAD_BOT_AVATAR_URL
	};
}

// Select the appropriate response based on matched pattern
function selectResponse(content: string): string {
	if (CHAD_PATTERNS.BRO.test(content)) {
		return randomElement(CHAD_RESPONSES.BRO);
	}
  
	if (CHAD_PATTERNS.GYM.test(content)) {
		return randomElement(CHAD_RESPONSES.GYM);
	}
  
	if (CHAD_PATTERNS.PROTEIN.test(content)) {
		return randomElement(CHAD_RESPONSES.PROTEIN);
	}
  
	return CHAD_RESPONSES.DEFAULT;
}

// Keyword trigger - responds to bro, gym, and protein
export const chadKeywordTrigger = createTriggerResponse({
	name: 'chad-keyword-trigger',
	priority: 1,
	condition: (message) => {
		const content = message.content.toLowerCase();
		return CHAD_PATTERNS.BRO.test(content) || 
           CHAD_PATTERNS.GYM.test(content) || 
           CHAD_PATTERNS.PROTEIN.test(content);
	},
	response: (msg) => selectResponse(msg.content.toLowerCase()),
	identity: getChadIdentity
});