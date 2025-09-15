import { Message } from 'discord.js';
import { matchesPattern } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { MUSIC_CORRECT_BOT_PATTERNS, MUSIC_CORRECT_BOT_RESPONSE } from './constants';

// Trigger for incorrect music bot commands
export const musicCorrectTrigger = createTriggerResponse({
	name: 'music-correct-trigger',
	condition: matchesPattern(MUSIC_CORRECT_BOT_PATTERNS.Default),
	response: async (message: Message) => MUSIC_CORRECT_BOT_RESPONSE(message.author.id),
	priority: 1,
});
