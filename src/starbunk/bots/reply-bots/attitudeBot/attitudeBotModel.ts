/**
 * AttitudeBot Responses
 *
 * Centralized collection of all responses used by AttitudeBot
 * Organizing these in one place makes them easier to maintain and update
 */

// Avatar URL for the bot
export const AVATAR_URL = 'https://i.ytimg.com/vi/56PMgO3q2-A/sddefault.jpg';

// Bot name
export const BOT_NAME = 'Xander Crews';

// Response when someone has a negative attitude
export const NEGATIVE_ATTITUDE_RESPONSE = "Not with THAT attitude!!!";

/**
 * Test constants for AttitudeBot tests
 */
export const TEST = {
	// User constants
	USER_NAME: 'TestUser',
	BOT_USER_ID: 'bot-id',
	BOT_USER_NAME: 'BotUser',

	// Test message content
	MESSAGE: {
		I_CANT: 'I can\'t do that',
		YOU_CANT: 'you can\'t do that',
		THEY_CANT: 'they can\'t do that',
		WE_CANT: 'we can\'t do that',
		UNRELATED: 'Hello there!'
	},

	// Test cases for negative attitude messages
	NEGATIVE_ATTITUDE_CASES: [
		{ description: '"I can\'t" messages', content: 'I can\'t do that' },
		{ description: '"you can\'t" messages', content: 'you can\'t do that' },
		{ description: '"they can\'t" messages', content: 'they can\'t do that' },
		{ description: '"we can\'t" messages', content: 'we can\'t do that' }
	]
};
