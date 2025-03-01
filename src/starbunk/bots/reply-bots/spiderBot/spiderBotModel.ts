/**
 * SpiderBot Responses
 *
 * Centralized collection of all responses used by SpiderBot
 * Organizing these in one place makes them easier to maintain and update
 */

// Avatar URL for the bot
export const AVATAR_URL = 'https://i.pinimg.com/736x/33/e0/06/33e00653eb485455ce5121b413b26d3b.jpg';

// Bot name
export const BOT_NAME = 'Spider-Bot';

// Response when someone types "Spiderman" without a hyphen
export const SPIDERMAN_CORRECTION = "Hey, it's \"**Spider-Man**\"! Don't forget the hyphen! Not Spiderman, that's dumb";

/**
 * Test constants for SpiderBot tests
 */
export const TEST = {
	// User constants
	USER_NAME: 'TestUser',
	BOT_USER_ID: 'bot-id',
	BOT_USER_NAME: 'BotUser',

	// Test message content
	MESSAGE: {
		SPIDERMAN: 'spiderman',
		SPIDERMAN_UPPERCASE: 'Spiderman',
		SPIDERMAN_ALL_CAPS: 'SPIDERMAN',
		SPIDER_MAN_WITH_SPACE: 'spider man',
		SPIDERMAN_IN_SENTENCE: 'I love spiderman movies!',
		SPIDER_MAN_WITH_HYPHEN: 'spider-man',
		SPIDER_MAN_WITH_HYPHEN_CAPS: 'Spider-Man',
		UNRELATED: 'Hello there!'
	}
};
