/**
 * BotBot Responses
 *
 * Centralized collection of all responses used by BotBot
 * Organizing these in one place makes them easier to maintain and update
 */

// Avatar URL for the bot
export const AVATAR_URL = 'https://cdn-icons-png.flaticon.com/512/4944/4944377.png';

// Bot name
export const BOT_NAME = 'BotBot';

// Random chance (percentage) for the bot to respond
export const RESPONSE_CHANCE = 5;

// Response when the bot responds to another bot
export const BOT_GREETING = "Why hello there, fellow bot 🤖";

/**
 * Test constants for BotBot tests
 */
export const TEST = {
	// User constants
	USER_NAME: 'TestUser',
	BOT_USER_ID: 'bot-id',
	BOT_USER_NAME: 'BotUser',

	// Test message content
	MESSAGE: {
		BOT: 'bot',
		BOT_IN_SENTENCE: 'I like this bot',
		UNRELATED: 'Hello there!'
	},

	// Test conditions
	CONDITIONS: {
		TRIGGER: true,
		NO_TRIGGER: false
	}
};
