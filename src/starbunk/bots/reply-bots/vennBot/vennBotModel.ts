/**
 * VennBot Responses
 *
 * Centralized collection of all responses used by VennBot
 * Organizing these in one place makes them easier to maintain and update
 */

// Avatar URL for the bot
export const AVATAR_URL = 'https://cdn.discordapp.com/attachments/854790294253117531/902975839420497940/venn.png';

// Bot name
export const BOT_NAME = 'VennBot';

// Random chance (percentage) for the bot to respond
export const RESPONSE_CHANCE = 5;

/**
 * Collection of cringe responses for VennBot to respond with
 */
export const CRINGE_RESPONSES = [
	'Sorry, but that was über cringe...',
	'Geez, that was hella cringe...',
	'That was cringe to the max...',
	'What a cringe thing to say...',
	'Mondo cringe, man...',
	"Yo that was the cringiest thing I've ever heard...",
	'Your daily serving of cringe, milord...',
	'On a scale of one to cringe, that was pretty cringe...',
	'That was pretty cringe :airplane:',
	'Wow, like....cringe much?',
	'Excuse me, I seem to have dropped my cringe. Do you have it perchance?',
	'Like I always say, that was pretty cringe...',
	'C.R.I.N.G.E',
];

/**
 * Test constants for VennBot tests
 */
export const TEST = {
	// User constants
	USER_NAME: 'TestUser',
	BOT_USER_ID: 'bot-id',
	BOT_USER_NAME: 'BotUser',
	VENN_USER_ID: 'venn-user-id',
	VENN_USER_NAME: 'Venn',
	OTHER_USER_ID: 'other-user-id',
	OTHER_USER_NAME: 'OtherUser',

	// Test message content
	MESSAGE: {
		HELLO: 'Hello everyone!',
		UNRELATED: 'This message has nothing to do with venn or cringe'
	},

	// Test conditions
	CONDITIONS: {
		RANDOM_CHANCE_TRIGGER: true,
		RANDOM_CHANCE_NO_TRIGGER: false,
		USER_CONDITION_TRIGGER: true,
		USER_CONDITION_NO_TRIGGER: false
	}
};
