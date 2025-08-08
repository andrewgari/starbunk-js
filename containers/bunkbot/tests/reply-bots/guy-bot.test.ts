import { mockMessage } from '../../src/test-utils/testUtils';
import guyBot from '../../src/reply-bots/guy-bot';
import { guyTrigger } from '../../src/reply-bots/guy-bot/triggers';
import { GUY_BOT_RESPONSES, getRandomGuyResponse, GUY_BOT_NAME, GUY_BOT_AVATAR_URL } from '../../src/reply-bots/guy-bot/constants';

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

describe('Guy Bot', () => {
	describe('Condition Checking - Pattern Matching', () => {
		it('should respond to messages containing "guy"', async () => {
			// Arrange: Create a message with "guy" in it
			const message = mockMessage({ content: 'hey guy how are you' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await guyTrigger.condition(message);

			// Assert: Bot should respond to messages containing "guy"
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "guy" at the beginning of a message', async () => {
			// Arrange: Create a message starting with "guy"
			const message = mockMessage({ content: 'guy you need to see this' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await guyTrigger.condition(message);

			// Assert: Bot should respond to this pattern
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "guy" at the end of a message', async () => {
			// Arrange: Create a message ending with "guy"
			const message = mockMessage({ content: 'what do you think guy' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await guyTrigger.condition(message);

			// Assert: Bot should respond to this pattern
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "guy" as a standalone word', async () => {
			// Arrange: Create a message with just "guy"
			const message = mockMessage({ content: 'guy' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await guyTrigger.condition(message);

			// Assert: Bot should respond to standalone "guy"
			expect(shouldRespond).toBe(true);
		});

		it('should be case insensitive', async () => {
			// Arrange: Create messages with different cases
			const upperMessage = mockMessage({ content: 'HEY GUY' });
			const mixedMessage = mockMessage({ content: 'GuY you are awesome' });

			// Act: Check if the bot should respond to these messages
			const shouldRespondUpper = await guyTrigger.condition(upperMessage);
			const shouldRespondMixed = await guyTrigger.condition(mixedMessage);

			// Assert: Bot should respond regardless of case
			expect(shouldRespondUpper).toBe(true);
			expect(shouldRespondMixed).toBe(true);
		});

		it('should respond to "guy" with word boundaries', async () => {
			// Arrange: Create messages with "guy" as complete word
			const message1 = mockMessage({ content: 'That guy is cool' });
			const message2 = mockMessage({ content: 'guy, what do you think?' });
			const message3 = mockMessage({ content: 'Listen guy.' });

			// Act: Check if the bot should respond to these messages
			const shouldRespond1 = await guyTrigger.condition(message1);
			const shouldRespond2 = await guyTrigger.condition(message2);
			const shouldRespond3 = await guyTrigger.condition(message3);

			// Assert: Bot should respond to "guy" with word boundaries
			expect(shouldRespond1).toBe(true);
			expect(shouldRespond2).toBe(true);
			expect(shouldRespond3).toBe(true);
		});

		it('should NOT respond to "guy" as part of larger words', async () => {
			// Arrange: Create messages with "guy" as part of larger words
			const message1 = mockMessage({ content: 'I bought some guyliner' });
			const message2 = mockMessage({ content: 'The guys are here' });
			const message3 = mockMessage({ content: 'That badguy is trouble' });

			// Act: Check if the bot should respond to these messages
			const shouldRespond1 = await guyTrigger.condition(message1);
			const shouldRespond2 = await guyTrigger.condition(message2);
			const shouldRespond3 = await guyTrigger.condition(message3);

			// Assert: Bot should NOT respond to "guy" as part of larger words
			expect(shouldRespond1).toBe(false);
			expect(shouldRespond2).toBe(false);
			expect(shouldRespond3).toBe(false);
		});

		it('should NOT respond to messages without the pattern', async () => {
			// Arrange: Create a message without "guy"
			const message = mockMessage({ content: 'hello world' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await guyTrigger.condition(message);

			// Assert: Bot should NOT respond to messages without the pattern
			expect(shouldRespond).toBe(false);
		});

		it('should NOT respond to empty messages', async () => {
			// Arrange: Create an empty message
			const message = mockMessage({ content: '' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await guyTrigger.condition(message);

			// Assert: Bot should NOT respond to empty messages
			expect(shouldRespond).toBe(false);
		});

		it('should NOT respond to messages with only whitespace', async () => {
			// Arrange: Create a message with only whitespace
			const message = mockMessage({ content: '   \n\t  ' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await guyTrigger.condition(message);

			// Assert: Bot should NOT respond to whitespace-only messages
			expect(shouldRespond).toBe(false);
		});
	});

	describe('Response Generation - Random Responses', () => {
		it('should generate a response from the guy responses array', async () => {
			// Arrange: Create a message that triggers the bot
			const message = mockMessage({ content: 'hey guy' });

			// Act: Generate the response
			const response = await guyTrigger.response(message);

			// Assert: Response should be one of the guy responses
			expect(GUY_BOT_RESPONSES).toContain(response);
		});

		it('should generate deterministic responses with mocked random', async () => {
			// Arrange: Set a specific random value and create a message
			mockRandomValue = 0.5; // This should select the middle response
			const message = mockMessage({ content: 'guy' });
			const expectedIndex = Math.floor(0.5 * GUY_BOT_RESPONSES.length);

			// Act: Generate the response
			const response = await guyTrigger.response(message);

			// Assert: Response should be the expected one based on mocked random
			expect(response).toBe(GUY_BOT_RESPONSES[expectedIndex]);
		});

		it('should generate different responses with different random values', async () => {
			// Arrange: Create a message that triggers the bot
			const message = mockMessage({ content: 'guy' });

			// Act: Generate responses with different random values
			mockRandomValue = 0.1;
			const response1 = await guyTrigger.response(message);

			mockRandomValue = 0.9;
			const response2 = await guyTrigger.response(message);

			// Assert: Responses should be different (unless we hit the same index by chance)
			const index1 = Math.floor(0.1 * GUY_BOT_RESPONSES.length);
			const index2 = Math.floor(0.9 * GUY_BOT_RESPONSES.length);
			
			expect(response1).toBe(GUY_BOT_RESPONSES[index1]);
			expect(response2).toBe(GUY_BOT_RESPONSES[index2]);
			
			// They should be different unless the array is very small
			if (GUY_BOT_RESPONSES.length > 2) {
				expect(response1).not.toBe(response2);
			}
		});
	});

	describe('Random Response Helper Function', () => {
		it('should return a response from the responses array', () => {
			// Arrange: Set a specific random value
			mockRandomValue = 0.3;

			// Act: Get a random response
			const response = getRandomGuyResponse();

			// Assert: Response should be from the array
			expect(GUY_BOT_RESPONSES).toContain(response);
		});

		it('should return deterministic response with mocked random', () => {
			// Arrange: Set a specific random value
			mockRandomValue = 0.7;
			const expectedIndex = Math.floor(0.7 * GUY_BOT_RESPONSES.length);

			// Act: Get a random response
			const response = getRandomGuyResponse();

			// Assert: Response should be the expected one
			expect(response).toBe(GUY_BOT_RESPONSES[expectedIndex]);
		});
	});

	describe('Bot Identity', () => {
		it.skip('should have the correct bot name', () => {
			// Arrange: Get the bot instance
			const bot = guyBot;

			// Act: Check the bot name from the instance
			const botName = bot.name;

			// Assert: Bot should have the correct name
			expect(botName).toBe(GUY_BOT_NAME);
			expect(botName).toBe('GuyBot');
		});
});
});
