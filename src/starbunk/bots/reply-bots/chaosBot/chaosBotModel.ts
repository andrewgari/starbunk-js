/**
 * ChaosBot Responses
 *
 * Centralized collection of all responses used by ChaosBot
 * Organizing these in one place makes them easier to maintain and update
 */

// Avatar URL for the bot
export const AVATAR_URL = 'https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de';

// Bot name
export const BOT_NAME = 'ChaosBot';

// Response when someone mentions "chaos"
export const CHAOS_RESPONSE = "All I know is...I'm here to kill Chaos";

/**
 * Test constants for ChaosBot tests
 */
export const TEST = {
	// User constants
	USER_NAME: 'TestUser',
	BOT_USER_ID: 'bot-id',
	BOT_USER_NAME: 'BotUser',

	// Test message content
	MESSAGE: {
		CHAOS: 'chaos',
		CHAOS_UPPERCASE: 'CHAOS',
		CHAOS_IN_SENTENCE: 'There is so much chaos in this room',
		CHAOS_AS_SUBSTRING: 'chaostheory',
		UNRELATED: 'Hello there!'
	}
};
