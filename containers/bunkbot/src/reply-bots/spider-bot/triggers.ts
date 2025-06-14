import { matchesPattern } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { SPIDER_BOT_PATTERNS, getRandomCheekyResponse, getRandomPositiveResponse } from './constants';

// Trigger for incorrect Spider-Man spelling
export const incorrectSpellingTrigger = createTriggerResponse({
	name: 'incorrect-spelling-trigger',
	condition: matchesPattern(SPIDER_BOT_PATTERNS.Default),
	response: async () => getRandomCheekyResponse(),
	priority: 1
});

// Trigger for correct Spider-Man spelling
export const correctSpellingTrigger = createTriggerResponse({
	name: 'correct-spelling-trigger',
	condition: matchesPattern(SPIDER_BOT_PATTERNS.Correct),
	response: async () => getRandomPositiveResponse(),
	priority: 2
});
