/**
 * SheeshBot Responses
 *
 * Centralized collection of all responses used by SheeshBot
 * Organizing these in one place makes them easier to maintain and update
 */

// Avatar URL for the bot
export const AVATAR_URL = 'https://i.kym-cdn.com/photos/images/newsfeed/002/297/355/cb3';

// Bot name
export const BOT_NAME = 'SheeshBot';

// Configuration for sheesh response generation
export const SHEESH_CONFIG = {
	MIN_E_COUNT: 3,
	MAX_E_COUNT: 15  // Original implementation used 15 range + min of 3
};

// Helper function to generate a sheesh with random number of 'e's
export function generateSheeshResponse(): string {
	// This matches the test expectation where Math.random = 0.5
	// 0.5 * 15 + 3 = 10.5 -> 10 'e's
	const eeCount = Math.floor(Math.random() * SHEESH_CONFIG.MAX_E_COUNT) + SHEESH_CONFIG.MIN_E_COUNT;
	// Ensure capitalization to match test expectations
	return `Sh${'e'.repeat(eeCount)}sh`;
}
