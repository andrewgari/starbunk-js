/**
 * Static data for the EzioBot
 */

export const EZIO_BOT_AVATAR_URL = 'https://www.creativeuncut.com/gallery-12/art/ac2-ezio5.jpg';
export const EZIO_BOT_NAME = 'Ezio Auditore Da Firenze';
export const EZIO_BOT_RESPONSE = 'Remember {username}, Nothing is true; Everything is permitted.';

/**
 * Test constants for EzioBot tests
 */
export const TEST = {
	// User constants
	USER_NAME: 'TestUser',
	BOT_USER_ID: 'bot-id',
	BOT_USER_NAME: 'BotUser',

	// Test message content
	MESSAGE: {
		WITH_EZIO: 'ezio',
		WITH_ASSASSIN: 'assassin',
		WITH_ASSASSINS_CREED: 'I love assassins creed',
		UNRELATED: 'Hello there!'
	},

	// Test conditions
	CONDITIONS: {
		TRIGGER: true,
		NO_TRIGGER: false
	},

	// Expected response
	RESPONSE: {
		TEMPLATE: 'Remember {username}, Nothing is true; Everything is permitted.'
	}
};
