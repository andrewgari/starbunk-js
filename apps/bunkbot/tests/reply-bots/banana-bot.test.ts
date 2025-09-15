import { mockMessage, mockUser } from '../../src/test-utils/testUtils';
import {
	BANANA_BOT_RESPONSES,
	getRandomBananaResponse,
	BANANA_BOT_NAME,
	BANANA_BOT_AVATAR_URL,
} from '../../src/reply-bots/banana-bot/constants';

// Define Venn's user ID for testing (since DEBUG_MODE=false, it uses Venn)
const VENN_USER_ID = '151120340343455744';

// Mock the isDebugMode function to return false for proper chance testing
// We'll use Venn's ID in tests instead of Cova's to match the production behavior
jest.mock('@starbunk/shared', () => ({
	...jest.requireActual('@starbunk/shared'),
	isDebugMode: jest.fn().mockReturnValue(false),
}));

// Mock the ConfigurationService to return Venn's user ID
jest.mock('../../src/services/configurationService', () => ({
	ConfigurationService: jest.fn().mockImplementation(() => ({
		getUserIdByUsername: jest.fn().mockImplementation((username: string) => {
			if (username === 'Venn') {
				return Promise.resolve(VENN_USER_ID);
			}
			return Promise.resolve(null);
		}),
		getUserConfig: jest.fn().mockResolvedValue({
			userId: VENN_USER_ID,
			username: 'Venn',
			isActive: true,
		}),
	})),
}));

// Import after mocks to ensure they're applied
import bananaBot from '../../src/reply-bots/banana-bot';
import { bananaTrigger } from '../../src/reply-bots/banana-bot/triggers';

// Mock Math.random for deterministic tests
const originalRandom = global.Math.random;
let mockRandomValue = 0.5;

beforeEach(() => {
	jest.clearAllMocks();
	// Mock Math.random
	global.Math.random = jest.fn().mockImplementation(() => mockRandomValue);
});

afterAll(() => {
	// Restore original Math.random
	global.Math.random = originalRandom;
});

describe('Banana Bot', () => {
	describe('Condition Checking', () => {
		it('should respond to messages containing "banana"', async () => {
			// Arrange: Create a message with "banana" in it
			const message = mockMessage({ content: 'I love banana bread' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await bananaTrigger.condition(message);

			// Assert: Bot should respond to messages containing "banana"
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "banana" at the beginning of a message', async () => {
			// Arrange: Create a message starting with "banana"
			const message = mockMessage({ content: 'banana split is delicious' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await bananaTrigger.condition(message);

			// Assert: Bot should respond to this pattern
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "banana" at the end of a message', async () => {
			// Arrange: Create a message ending with "banana"
			const message = mockMessage({ content: 'I want a banana' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await bananaTrigger.condition(message);

			// Assert: Bot should respond to this pattern
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "banana" as a standalone word', async () => {
			// Arrange: Create a message with just "banana"
			const message = mockMessage({ content: 'banana' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await bananaTrigger.condition(message);

			// Assert: Bot should respond to standalone "banana"
			expect(shouldRespond).toBe(true);
		});

		it('should be case insensitive', async () => {
			// Arrange: Create messages with different cases
			const upperMessage = mockMessage({ content: 'BANANA REPUBLIC' });
			const mixedMessage = mockMessage({ content: 'BaNaNa SplIt' });

			// Act: Check if the bot should respond to these messages
			const shouldRespondUpper = await bananaTrigger.condition(upperMessage);
			const shouldRespondMixed = await bananaTrigger.condition(mixedMessage);

			// Assert: Bot should respond regardless of case
			expect(shouldRespondUpper).toBe(true);
			expect(shouldRespondMixed).toBe(true);
		});

		it('should respond to partial word matches (unlike baby-bot)', async () => {
			// Arrange: Create messages with "banana" as part of other words
			const message1 = mockMessage({ content: 'bananas are great' });
			const message2 = mockMessage({ content: 'bananasplit' });

			// Act: Check if the bot should respond to these messages
			const shouldRespond1 = await bananaTrigger.condition(message1);
			const shouldRespond2 = await bananaTrigger.condition(message2);

			// Assert: Bot should respond to partial matches (regex doesn't use word boundaries)
			expect(shouldRespond1).toBe(true);
			expect(shouldRespond2).toBe(true);
		});

		it('should NOT respond to messages without "banana" from non-target users', async () => {
			// Arrange: Create a message without "banana" from a non-target user
			const nonTargetUser = mockUser({ id: '999999999999999999' }); // Different from Cova/Venn
			const message = mockMessage({ content: 'hello world', author: nonTargetUser });

			// Act: Check if the trigger condition matches
			const shouldRespond = await bananaTrigger.condition(message);

			// Assert: Bot should NOT respond to messages without "banana" from non-target users
			expect(shouldRespond).toBe(false);
		});

		it('should respond to empty messages from target user with favorable chance', async () => {
			// Arrange: Set favorable random value and create empty message from target user (Venn in production mode)
			mockRandomValue = 0.05; // 5% - within 10% threshold
			const targetUser = mockUser({ id: VENN_USER_ID }); // Venn's actual ID
			const message = mockMessage({ content: '', author: targetUser });

			// Act: Check if the trigger condition matches
			const shouldRespond = await bananaTrigger.condition(message);

			// Assert: Bot should respond to target user messages when chance is favorable
			expect(shouldRespond).toBe(true);
		});

		it('should NOT respond to empty messages from target user with unfavorable chance', async () => {
			// Arrange: Set unfavorable random value and create empty message from target user (Venn in production mode)
			mockRandomValue = 0.15; // 15% - above 10% threshold
			const targetUser = mockUser({ id: VENN_USER_ID }); // Venn's actual ID
			const message = mockMessage({ content: '', author: targetUser });

			// Act: Check if the trigger condition matches
			const shouldRespond = await bananaTrigger.condition(message);

			// Assert: Bot should NOT respond when chance is unfavorable
			expect(shouldRespond).toBe(false);
		});
	});

	describe('Response Generation', () => {
		it('should generate a response from the banana responses array', async () => {
			// Arrange: Create a message that triggers the bot
			const message = mockMessage({ content: 'I love banana' });

			// Act: Generate the response
			const response = await bananaTrigger.response(message);

			// Assert: Response should be one of the banana responses
			expect(BANANA_BOT_RESPONSES).toContain(response);
		});

		it('should generate deterministic responses with mocked random', async () => {
			// Arrange: Set a specific random value and create a message
			mockRandomValue = 0.5; // This should select the middle response
			const message = mockMessage({ content: 'banana' });
			const expectedIndex = Math.floor(0.5 * BANANA_BOT_RESPONSES.length);

			// Act: Generate the response
			const response = await bananaTrigger.response(message);

			// Assert: Response should be the expected one based on mocked random
			expect(response).toBe(BANANA_BOT_RESPONSES[expectedIndex]);
		});

		it('should generate different responses with different random values', async () => {
			// Arrange: Create a message that triggers the bot
			const message = mockMessage({ content: 'banana' });

			// Act: Generate responses with different random values
			mockRandomValue = 0.1;
			const response1 = await bananaTrigger.response(message);

			mockRandomValue = 0.9;
			const response2 = await bananaTrigger.response(message);

			// Assert: Responses should be different (unless we hit the same index by chance)
			const index1 = Math.floor(0.1 * BANANA_BOT_RESPONSES.length);
			const index2 = Math.floor(0.9 * BANANA_BOT_RESPONSES.length);

			expect(response1).toBe(BANANA_BOT_RESPONSES[index1]);
			expect(response2).toBe(BANANA_BOT_RESPONSES[index2]);

			// They should be different unless the array is very small
			if (BANANA_BOT_RESPONSES.length > 2) {
				expect(response1).not.toBe(response2);
			}
		});
	});

	describe('Random Response Helper Function', () => {
		it('should return a response from the responses array', () => {
			// Arrange: Set a specific random value
			mockRandomValue = 0.3;

			// Act: Get a random response
			const response = getRandomBananaResponse();

			// Assert: Response should be from the array
			expect(BANANA_BOT_RESPONSES).toContain(response);
		});

		it('should return deterministic response with mocked random', () => {
			// Arrange: Set a specific random value
			mockRandomValue = 0.7;
			const expectedIndex = Math.floor(0.7 * BANANA_BOT_RESPONSES.length);

			// Act: Get a random response
			const response = getRandomBananaResponse();

			// Assert: Response should be the expected one
			expect(response).toBe(BANANA_BOT_RESPONSES[expectedIndex]);
		});
	});

	describe('Bot Identity', () => {
		it('should have the correct bot name', () => {
			// Arrange: Get the bot instance
			const bot = bananaBot;

			// Act: Check the bot name from the instance
			const botName = bot.name;

			// Assert: Bot should have the correct name
			expect(botName).toBe(BANANA_BOT_NAME);
			expect(botName).toBe('BananaBot');
		});

		it('should have the correct bot name constant', () => {
			// Arrange & Act: Check the bot name constant
			// Assert: Bot name constant should be correct
			expect(BANANA_BOT_NAME).toBe('BananaBot');
		});

		it('should have an avatar URL configured', () => {
			// Arrange & Act: Check the avatar URL constant
			// Assert: Bot should have an avatar URL
			expect(BANANA_BOT_AVATAR_URL).toBeDefined();
			expect(BANANA_BOT_AVATAR_URL).toContain('http');
		});
	});

	describe('Edge Cases', () => {
		it('should handle messages with special characters', async () => {
			// Arrange: Create a message with special characters
			const message = mockMessage({ content: 'banana @#$%^&*()' });

			// Act: Check if the bot should respond
			const shouldRespond = await bananaTrigger.condition(message);

			// Assert: Bot should still respond to the pattern
			expect(shouldRespond).toBe(true);
		});

		it('should handle very long messages', async () => {
			// Arrange: Create a very long message with the pattern
			const longContent =
				'This is a very long message that goes on and on and mentions banana somewhere in the middle of all this text';
			const message = mockMessage({ content: longContent });

			// Act: Check if the bot should respond
			const shouldRespond = await bananaTrigger.condition(message);

			// Assert: Bot should respond even to long messages
			expect(shouldRespond).toBe(true);
		});

		it('should handle messages with multiple "banana" mentions', async () => {
			// Arrange: Create a message with multiple "banana" words
			const message = mockMessage({ content: 'banana banana banana split' });

			// Act: Check if the bot should respond
			const shouldRespond = await bananaTrigger.condition(message);

			// Assert: Bot should respond to messages with multiple matches
			expect(shouldRespond).toBe(true);
		});

		it('should handle "banana" with punctuation', async () => {
			// Arrange: Create messages with "banana" followed by punctuation
			const message1 = mockMessage({ content: 'banana!' });
			const message2 = mockMessage({ content: 'banana?' });
			const message3 = mockMessage({ content: 'banana.' });

			// Act: Check if the bot should respond
			const shouldRespond1 = await bananaTrigger.condition(message1);
			const shouldRespond2 = await bananaTrigger.condition(message2);
			const shouldRespond3 = await bananaTrigger.condition(message3);

			// Assert: Bot should respond to "banana" with punctuation
			expect(shouldRespond1).toBe(true);
			expect(shouldRespond2).toBe(true);
			expect(shouldRespond3).toBe(true);
		});
	});

	describe('Response Content Validation', () => {
		it('should have a non-empty responses array', () => {
			// Arrange & Act: Check the responses array
			// Assert: Array should not be empty
			expect(BANANA_BOT_RESPONSES.length).toBeGreaterThan(0);
		});

		it('should have all string responses', () => {
			// Arrange & Act: Check all responses
			// Assert: All responses should be strings
			BANANA_BOT_RESPONSES.forEach((response) => {
				expect(typeof response).toBe('string');
				expect(response.length).toBeGreaterThan(0);
			});
		});
	});
});
