import { mockMessage, mockUser } from '../../src/test-utils/testUtils';
import botBot from '../../src/reply-bots/bot-bot';
import { botTrigger } from '../../src/reply-bots/bot-bot/triggers';
import { BOT_BOT_RESPONSES, BOT_BOT_RESPONSE_RATE, BOT_BOT_NAME, BOT_BOT_AVATAR_URL } from '../../src/reply-bots/bot-bot/constants';

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

describe('Bot Bot', () => {
	describe('Condition Checking - Bot Messages with Chance', () => {
		it('should respond to bot messages when random chance is within threshold', async () => {
			// Arrange: Set random value to be within the 5% chance threshold
			mockRandomValue = 0.03; // 3% - within 5% threshold
			const botUser = mockUser({ bot: true });
			const message = mockMessage({ 
				content: 'Hello from another bot',
				author: botUser
			});

			// Act: Check if the bot should respond to this message
			const shouldRespond = await botTrigger.condition(message);

			// Assert: Bot should respond to bot messages when chance is favorable
			expect(shouldRespond).toBe(true);
		});

		it('should NOT respond to bot messages when random chance is above threshold', async () => {
			// Arrange: Set random value to be above the 5% chance threshold
			mockRandomValue = 0.07; // 7% - above 5% threshold
			const botUser = mockUser({ bot: true });
			const message = mockMessage({ 
				content: 'Hello from another bot',
				author: botUser
			});

			// Act: Check if the bot should respond to this message
			const shouldRespond = await botTrigger.condition(message);

			// Assert: Bot should NOT respond when chance is unfavorable
			expect(shouldRespond).toBe(false);
		});

		it('should respond at exactly the threshold boundary', async () => {
			// Arrange: Set random value to exactly the threshold (5%)
			mockRandomValue = BOT_BOT_RESPONSE_RATE / 100; // Exactly 5%
			const botUser = mockUser({ bot: true });
			const message = mockMessage({ 
				content: 'test message from bot',
				author: botUser
			});

			// Act: Check if the bot should respond to this message
			const shouldRespond = await botTrigger.condition(message);

			// Assert: Bot should respond at the exact threshold
			expect(shouldRespond).toBe(true);
		});

		it('should NOT respond to human messages regardless of chance', async () => {
			// Arrange: Set favorable random value but message from human
			mockRandomValue = 0.01; // Within 5% threshold
			const humanUser = mockUser({ bot: false });
			const message = mockMessage({ 
				content: 'Hello from a human',
				author: humanUser
			});

			// Act: Check if the bot should respond to human message
			const shouldRespond = await botTrigger.condition(message);

			// Assert: Bot should NOT respond to human messages
			expect(shouldRespond).toBe(false);
		});

		it('should respond to its own messages when chance is favorable', async () => {
			// Arrange: Set favorable random value and message from self (bot)
			mockRandomValue = 0.02; // Within 5% threshold
			const selfBotUser = mockUser({ bot: true, id: 'self-bot-id' });
			const message = mockMessage({ 
				content: 'Hello from myself',
				author: selfBotUser
			});

			// Act: Check if the bot should respond to its own message
			const shouldRespond = await botTrigger.condition(message);

			// Assert: Bot should respond to its own messages when chance is favorable
			expect(shouldRespond).toBe(true);
		});

		it('should handle empty bot messages with chance logic', async () => {
			// Arrange: Set favorable random value with empty message from bot
			mockRandomValue = 0.02; // Within 5% threshold
			const botUser = mockUser({ bot: true });
			const message = mockMessage({ 
				content: '',
				author: botUser
			});

			// Act: Check if the bot should respond to empty bot message
			const shouldRespond = await botTrigger.condition(message);

			// Assert: Bot should still apply chance logic to empty bot messages
			expect(shouldRespond).toBe(true);
		});

		it('should handle whitespace-only bot messages with chance logic', async () => {
			// Arrange: Set favorable random value with whitespace message from bot
			mockRandomValue = 0.02; // Within 5% threshold
			const botUser = mockUser({ bot: true });
			const message = mockMessage({ 
				content: '   \n\t  ',
				author: botUser
			});

			// Act: Check if the bot should respond to whitespace bot message
			const shouldRespond = await botTrigger.condition(message);

			// Assert: Bot should still apply chance logic to whitespace bot messages
			expect(shouldRespond).toBe(true);
		});
	});

	describe('Response Generation', () => {
		it('should generate the correct bot response', async () => {
			// Arrange: Create a bot message (content doesn't matter for bot bot)
			const botUser = mockUser({ bot: true });
			const message = mockMessage({ 
				content: 'any content from bot',
				author: botUser
			});

			// Act: Generate the response
			const response = await botTrigger.response(message);

			// Assert: Response should be the expected bot message
			expect(response).toBe(BOT_BOT_RESPONSES.Default);
		});

		it('should generate consistent responses regardless of bot message content', async () => {
			// Arrange: Create different bot messages
			const botUser = mockUser({ bot: true });
			const message1 = mockMessage({ content: 'hello', author: botUser });
			const message2 = mockMessage({ content: 'beep boop', author: botUser });
			const message3 = mockMessage({ content: 'processing...', author: botUser });

			// Act: Generate responses for all messages
			const response1 = await botTrigger.response(message1);
			const response2 = await botTrigger.response(message2);
			const response3 = await botTrigger.response(message3);

			// Assert: All responses should be the same bot message
			expect(response1).toBe(BOT_BOT_RESPONSES.Default);
			expect(response2).toBe(BOT_BOT_RESPONSES.Default);
			expect(response3).toBe(BOT_BOT_RESPONSES.Default);
		});

		it('should generate response even for empty bot messages', async () => {
			// Arrange: Create an empty bot message
			const botUser = mockUser({ bot: true });
			const message = mockMessage({ 
				content: '',
				author: botUser
			});

			// Act: Generate the response
			const response = await botTrigger.response(message);

			// Assert: Response should still be the bot message
			expect(response).toBe(BOT_BOT_RESPONSES.Default);
		});
	});

	describe('Bot Identity', () => {
		it('should have the correct bot name', () => {
			// Arrange: Get the bot instance
			const bot = botBot;

			// Act: Check the bot name from the instance
			const botName = bot.name;

			// Assert: Bot should have the correct name
			expect(botName).toBe(BOT_BOT_NAME);
			expect(botName).toBe('BotBot');
		});
});
});
