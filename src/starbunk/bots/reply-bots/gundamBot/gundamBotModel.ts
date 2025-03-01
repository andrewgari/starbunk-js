/**
 * GundamBot Responses
 *
 * Centralized collection of all responses used by GundamBot
 * Organizing these in one place makes them easier to maintain and update
 */

// Avatar URL for the bot
export const AVATAR_URL = 'https://i.imgur.com/WuBBl0A.png';

// Bot name
export const BOT_NAME = 'GundamBot';

// Response when someone mentions "gundam"
export const GUNDAM_RESPONSE = "That's the giant unicorn robot gandam, there i said it";

/**
 * Test constants for GundamBot tests
 */
export const TEST = {
	// User constants
	USER_NAME: 'TestUser',
	BOT_USER_ID: 'bot-id',
	BOT_USER_NAME: 'BotUser',

	// Test message content
	MESSAGE: {
		GUNDAM: 'gundam',
		GUNDAM_UPPERCASE: 'GUNDAM',
		GANDAM: 'gandam',
		GUNDAM_IN_SENTENCE: 'I love watching gundam anime',
		GUNDAM_AS_SUBSTRING: 'gundamium',
		UNRELATED: 'Hello there!'
	},

	// Test conditions
	CONDITIONS: {
		TRIGGER: true,
		NO_TRIGGER: false
	}
};
