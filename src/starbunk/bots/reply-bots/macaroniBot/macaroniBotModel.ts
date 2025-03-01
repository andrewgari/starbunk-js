/**
 * MacaroniBot Responses
 *
 * Centralized collection of all responses used by MacaroniBot
 * Organizing these in one place makes them easier to maintain and update
 */

// Avatar URL for the bot
export const AVATAR_URL = 'https://i.imgur.com/Jx5v7bZ.png';

// Bot name
export const BOT_NAME = 'Macaroni Bot';

// Response when someone mentions "venn"
export const VENN_CORRECTION = "Correction: you mean Venn \"Tyrone \"The \"Macaroni\" Man\" Johnson\" Caelum";

// Response when someone mentions "macaroni"
export const MACARONI_MENTION = (userMention: string): string => `Are you trying to reach ${userMention}`;

/**
 * Test constants for MacaroniBot tests
 */
export const TEST = {
	// User constants
	USER_NAME: 'TestUser',
	BOT_USER_ID: 'bot-id',
	BOT_USER_NAME: 'BotUser',
	VENN_USER_ID: '123456789',

	// Test message content
	MESSAGE: {
		VENN: 'venn',
		VENN_UPPERCASE: 'VENN',
		VENN_IN_SENTENCE: 'I was talking to venn yesterday',
		MACARONI: 'macaroni',
		MACARONI_UPPERCASE: 'MACARONI',
		MAC: 'mac',
		PASTA: 'pasta',
		UNRELATED: 'Hello there!'
	},

	// Test responses
	RESPONSE: {
		VENN_CORRECTION: VENN_CORRECTION,
		MACARONI_MENTION: '<@123456789>'
	}
};
