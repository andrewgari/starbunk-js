import { Message } from 'discord.js';
import type { BotIdentity as _BotIdentity } from '../../types/bot-identity';
import { withChance } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import {
	HOMONYM_BOT_AVATAR_URL,
	HOMONYM_BOT_NAME,
	HOMONYM_BOT_RESPONSE_RATE,
	HOMONYM_PAIRS,
	getRandomCorrection,
} from './constants';

// Helper function to find homonyms in a message
function findHomonymsInMessage(message: string): string[] {
	const words = message.toLowerCase().split(/\s+/);
	const foundHomonyms: string[] = [];

	for (const word of words) {
		// Clean the word from punctuation
		const cleanWord = word.replace(/[.,!?]$/, '');
		const pair = HOMONYM_PAIRS.find((p) => p.words.includes(cleanWord));
		if (pair) {
			foundHomonyms.push(cleanWord);
		}
	}

	return foundHomonyms;
}

// Trigger for homonym detection
export const homonymTrigger = createTriggerResponse({
	name: 'homonym-trigger',
	condition: (message: Message) => {
		const homonyms = findHomonymsInMessage(message.content);
		return homonyms.length > 0 && withChance(HOMONYM_BOT_RESPONSE_RATE)(message);
	},
	response: async (message: Message) => {
		const homonyms = findHomonymsInMessage(message.content);
		if (homonyms.length === 0) return '';

		// Get a random homonym from the found ones
		const randomHomonym = homonyms[Math.floor(Math.random() * homonyms.length)];
		const correction = getRandomCorrection(randomHomonym);

		if (!correction) return '';

		return `You mean "${correction}"*`;
	},
	identity: {
		botName: HOMONYM_BOT_NAME,
		avatarUrl: HOMONYM_BOT_AVATAR_URL,
	},
	priority: 1,
});
