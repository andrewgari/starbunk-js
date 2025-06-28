import { mockMessage, mockUser } from '../../src/test-utils/testUtils';
import chadBot from '../../src/reply-bots/chad-bot';
import { chadKeywordTrigger } from '../../src/reply-bots/chad-bot/triggers';
import { CHAD_RESPONSE, CHAD_USER_ID, CHAD_RESPONSE_CHANCE, CHAD_BOT_NAME, CHAD_BOT_AVATAR_URL } from '../../src/reply-bots/chad-bot/constants';

// Mock the isDebugMode function to return false for proper chance testing
jest.mock('@starbunk/shared', () => ({
	...jest.requireActual('@starbunk/shared'),
	isDebugMode: jest.fn().mockReturnValue(false)
}));

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

describe('Chad Bot', () => {
	describe('Condition Checking - Chance-based Triggering', () => {
		it('should respond when random chance is within threshold', async () => {
			// Arrange: Set random value to be within the 1% chance threshold
			mockRandomValue = 0.005; // 0.5% - within 1% threshold
			const message = mockMessage({ content: 'any message content' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await chadKeywordTrigger.condition(message);

			// Assert: Bot should respond when chance is favorable
			expect(shouldRespond).toBe(true);
		});

		it('should NOT respond when random chance is above threshold', async () => {
			// Arrange: Set random value to be above the 1% chance threshold
			mockRandomValue = 0.02; // 2% - above 1% threshold
			const message = mockMessage({ content: 'any message content' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await chadKeywordTrigger.condition(message);

			// Assert: Bot should NOT respond when chance is unfavorable
			expect(shouldRespond).toBe(false);
		});

		it('should respond at exactly the threshold boundary', async () => {
			// Arrange: Set random value to exactly the threshold (1%)
			mockRandomValue = CHAD_RESPONSE_CHANCE / 100; // Exactly 1%
			const message = mockMessage({ content: 'test message' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await chadKeywordTrigger.condition(message);

			// Assert: Bot should respond at the exact threshold
			expect(shouldRespond).toBe(true);
		});

		it('should NOT respond to messages from Chad himself', async () => {
			// Arrange: Set favorable random value but message from Chad
			mockRandomValue = 0.005; // Within 1% threshold
			const chadUser = mockUser({ id: CHAD_USER_ID });
			const message = mockMessage({ 
				content: 'I am Chad',
				author: chadUser
			});

			// Act: Check if the bot should respond to Chad's message
			const shouldRespond = await chadKeywordTrigger.condition(message);

			// Assert: Bot should NOT respond to Chad's own messages
			expect(shouldRespond).toBe(false);
		});

		it('should respond to messages from other users when chance is favorable', async () => {
			// Arrange: Set favorable random value and message from different user
			mockRandomValue = 0.005; // Within 1% threshold
			const otherUser = mockUser({ id: '123456789012345678' }); // Different from Chad's ID
			const message = mockMessage({ 
				content: 'hello world',
				author: otherUser
			});

			// Act: Check if the bot should respond to this message
			const shouldRespond = await chadKeywordTrigger.condition(message);

			// Assert: Bot should respond to other users when chance is favorable
			expect(shouldRespond).toBe(true);
		});

		it('should handle empty messages with chance logic', async () => {
			// Arrange: Set favorable random value with empty message
			mockRandomValue = 0.005; // Within 1% threshold
			const message = mockMessage({ content: '' });

			// Act: Check if the bot should respond to empty message
			const shouldRespond = await chadKeywordTrigger.condition(message);

			// Assert: Bot should still apply chance logic to empty messages
			expect(shouldRespond).toBe(true);
		});

		it('should handle whitespace-only messages with chance logic', async () => {
			// Arrange: Set favorable random value with whitespace message
			mockRandomValue = 0.005; // Within 1% threshold
			const message = mockMessage({ content: '   \n\t  ' });

			// Act: Check if the bot should respond to whitespace message
			const shouldRespond = await chadKeywordTrigger.condition(message);

			// Assert: Bot should still apply chance logic to whitespace messages
			expect(shouldRespond).toBe(true);
		});
	});

	describe('Response Generation', () => {
		it('should generate the correct Chad response', async () => {
			// Arrange: Create a message (content doesn't matter for Chad bot)
			const message = mockMessage({ content: 'any content' });

			// Act: Generate the response
			const response = await chadKeywordTrigger.response(message);

			// Assert: Response should be the expected Chad message
			expect(response).toBe(CHAD_RESPONSE);
		});

		it('should generate consistent responses regardless of message content', async () => {
			// Arrange: Create different messages
			const message1 = mockMessage({ content: 'hello' });
			const message2 = mockMessage({ content: 'gym time' });
			const message3 = mockMessage({ content: 'protein shake' });

			// Act: Generate responses for all messages
			const response1 = await chadKeywordTrigger.response(message1);
			const response2 = await chadKeywordTrigger.response(message2);
			const response3 = await chadKeywordTrigger.response(message3);

			// Assert: All responses should be the same Chad message
			expect(response1).toBe(CHAD_RESPONSE);
			expect(response2).toBe(CHAD_RESPONSE);
			expect(response3).toBe(CHAD_RESPONSE);
		});

		it('should generate response even for empty messages', async () => {
			// Arrange: Create an empty message
			const message = mockMessage({ content: '' });

			// Act: Generate the response
			const response = await chadKeywordTrigger.response(message);

			// Assert: Response should still be the Chad message
			expect(response).toBe(CHAD_RESPONSE);
		});
	});

	describe('Bot Identity', () => {
		it('should have the correct bot name', () => {
			// Arrange: Get the bot instance
			const bot = chadBot;

			// Act: Check the bot name from the instance
			const botName = bot.name;

			// Assert: Bot should have the correct name
			expect(botName).toBe('Chad Bot');
		});
});
});
