import { Message } from 'discord.js';
import { and, matchesPattern, withChance } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { HOMONYM_BOT_RESPONSE_RATE, HOMONYM_PAIRS } from './constants';

interface HomonymMatch {
	word: string;
	correction: string;
}

// Helper function to find matching homonym pair
function findMatchingHomonymPair(content: string): HomonymMatch | null {
	const words = content.toLowerCase().split(/\s+/);

	for (const pair of HOMONYM_PAIRS) {
		for (const word of pair.words) {
			if (words.includes(word)) {
				return {
					word,
					correction: pair.corrections[word]
				};
			}
		}
	}

	return null;
}

// Create a pattern that matches any homonym word
const homonymPattern = new RegExp(
	`\\b(${HOMONYM_PAIRS.flatMap(pair => pair.words).join('|')})\\b`,
	'i'
);

// Trigger for homonym corrections
export const homonymTrigger = createTriggerResponse({
	name: 'homonym-trigger',
	condition: and(
		matchesPattern(homonymPattern),
		withChance(HOMONYM_BOT_RESPONSE_RATE)
	),
	response: (message: Message) => {
		const match = findMatchingHomonymPair(message.content);
		return match ? match.correction : 'No correction needed.';
	},
	priority: 1
});
