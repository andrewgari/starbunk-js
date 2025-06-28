import { mockMessage } from '../../src/test-utils/testUtils';
import sheeshBot from '../../src/reply-bots/sheesh-bot';
import { sheeshTrigger } from '../../src/reply-bots/sheesh-bot/triggers';
import { generateSheeshResponse, SHEESH_BOT_NAME, SHEESH_BOT_AVATAR_URL } from '../../src/reply-bots/sheesh-bot/constants';

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

describe('Sheesh Bot', () => {
	describe('Condition Checking - Pattern Matching', () => {
		it('should respond to "sheesh" with standard spelling', async () => {
			// Arrange: Create a message with "sheesh"
			const message = mockMessage({ content: 'sheesh that was crazy' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await sheeshTrigger.condition(message);

			// Assert: Bot should respond to "sheesh"
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "sheeesh" with extra e\'s', async () => {
			// Arrange: Create a message with extended "sheesh"
			const message = mockMessage({ content: 'sheeesh that was wild' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await sheeshTrigger.condition(message);

			// Assert: Bot should respond to extended "sheesh"
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "sheeeeeesh" with many e\'s', async () => {
			// Arrange: Create a message with many e's
			const message = mockMessage({ content: 'sheeeeeesh bro' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await sheeshTrigger.condition(message);

			// Assert: Bot should respond to extended "sheesh"
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "sheesh" at the beginning of a message', async () => {
			// Arrange: Create a message starting with "sheesh"
			const message = mockMessage({ content: 'sheesh what happened here' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await sheeshTrigger.condition(message);

			// Assert: Bot should respond to this pattern
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "sheesh" at the end of a message', async () => {
			// Arrange: Create a message ending with "sheesh"
			const message = mockMessage({ content: 'that was intense sheesh' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await sheeshTrigger.condition(message);

			// Assert: Bot should respond to this pattern
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "sheesh" as a standalone word', async () => {
			// Arrange: Create a message with just "sheesh"
			const message = mockMessage({ content: 'sheesh' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await sheeshTrigger.condition(message);

			// Assert: Bot should respond to standalone "sheesh"
			expect(shouldRespond).toBe(true);
		});

		it('should be case insensitive', async () => {
			// Arrange: Create messages with different cases
			const upperMessage = mockMessage({ content: 'SHEESH THAT WAS LOUD' });
			const mixedMessage = mockMessage({ content: 'ShEeEsH what a day' });

			// Act: Check if the bot should respond to these messages
			const shouldRespondUpper = await sheeshTrigger.condition(upperMessage);
			const shouldRespondMixed = await sheeshTrigger.condition(mixedMessage);

			// Assert: Bot should respond regardless of case
			expect(shouldRespondUpper).toBe(true);
			expect(shouldRespondMixed).toBe(true);
		});

		it('should use word boundaries (not respond to partial matches)', async () => {
			// Arrange: Create messages with "sheesh" as part of other words
			const message1 = mockMessage({ content: 'sheeshkebab is delicious' });
			const message2 = mockMessage({ content: 'newsheesh update' });

			// Act: Check if the bot should respond to these messages
			const shouldRespond1 = await sheeshTrigger.condition(message1);
			const shouldRespond2 = await sheeshTrigger.condition(message2);

			// Assert: Bot should NOT respond to partial matches due to word boundaries
			expect(shouldRespond1).toBe(false);
			expect(shouldRespond2).toBe(false);
		});

		it('should NOT respond to messages without "sheesh"', async () => {
			// Arrange: Create a message without "sheesh"
			const message = mockMessage({ content: 'hello world' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await sheeshTrigger.condition(message);

			// Assert: Bot should NOT respond to messages without "sheesh"
			expect(shouldRespond).toBe(false);
		});

		it('should NOT respond to empty messages', async () => {
			// Arrange: Create an empty message
			const message = mockMessage({ content: '' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await sheeshTrigger.condition(message);

			// Assert: Bot should NOT respond to empty messages
			expect(shouldRespond).toBe(false);
		});

		it('should NOT respond to messages with only whitespace', async () => {
			// Arrange: Create a message with only whitespace
			const message = mockMessage({ content: '   \n\t  ' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await sheeshTrigger.condition(message);

			// Assert: Bot should NOT respond to whitespace-only messages
			expect(shouldRespond).toBe(false);
		});

		it('should NOT respond to similar but different words', async () => {
			// Arrange: Create messages with similar but different words
			const message1 = mockMessage({ content: 'sheep are fluffy' });
			const message2 = mockMessage({ content: 'sheet music' });
			const message3 = mockMessage({ content: 'shesh is not sheesh' });

			// Act: Check if the bot should respond to these messages
			const shouldRespond1 = await sheeshTrigger.condition(message1);
			const shouldRespond2 = await sheeshTrigger.condition(message2);
			const shouldRespond3 = await sheeshTrigger.condition(message3);

			// Assert: Bot should NOT respond to similar but different words
			expect(shouldRespond1).toBe(false);
			expect(shouldRespond2).toBe(false);
			expect(shouldRespond3).toBe(false);
		});
	});

	describe('Response Generation - Dynamic Sheesh', () => {
		it('should generate a sheesh response with variable e\'s', async () => {
			// Arrange: Create a message that triggers the bot
			const message = mockMessage({ content: 'sheesh that was crazy' });

			// Act: Generate the response
			const response = await sheeshTrigger.response(message);

			// Assert: Response should be a sheesh with variable e's and emoji
			expect(response).toMatch(/^sh[e]{2,20}sh 😤$/);
		});

		it('should generate deterministic responses with mocked random', async () => {
			// Arrange: Set a specific random value and create a message
			mockRandomValue = 0.5; // This should give us a specific number of e's
			const message = mockMessage({ content: 'sheesh' });
			const expectedECount = 2 + Math.floor(0.5 * 18); // 2 + 9 = 11 e's

			// Act: Generate the response
			const response = await sheeshTrigger.response(message);

			// Assert: Response should have the expected number of e's
			const expectedResponse = 'sh' + 'e'.repeat(expectedECount) + 'sh 😤';
			expect(response).toBe(expectedResponse);
		});

		it('should generate different responses with different random values', async () => {
			// Arrange: Create a message that triggers the bot
			const message = mockMessage({ content: 'sheesh' });

			// Act: Generate responses with different random values
			mockRandomValue = 0.1; // Should give fewer e's
			const response1 = await sheeshTrigger.response(message);

			mockRandomValue = 0.9; // Should give more e's
			const response2 = await sheeshTrigger.response(message);

			// Assert: Responses should be different
			expect(response1).not.toBe(response2);
			expect(response1).toMatch(/^sh[e]{2,20}sh 😤$/);
			expect(response2).toMatch(/^sh[e]{2,20}sh 😤$/);
			
			// The one with higher random value should have more e's
			const eCount1 = response1.match(/e/g)?.length || 0;
			const eCount2 = response2.match(/e/g)?.length || 0;
			expect(eCount2).toBeGreaterThan(eCount1);
		});
	});

	describe('Helper Function - generateSheeshResponse, SHEESH_BOT_NAME, SHEESH_BOT_AVATAR_URL', () => {
		it('should generate sheesh with variable e count', () => {
			// Arrange: Set a specific random value
			mockRandomValue = 0.3;

			// Act: Generate a sheesh response
			const response = generateSheeshResponse();

			// Assert: Response should match the expected pattern
			expect(response).toMatch(/^sh[e]{2,20}sh 😤$/);
		});

		it('should generate deterministic response with mocked random', () => {
			// Arrange: Set a specific random value
			mockRandomValue = 0.7;
			const expectedECount = 2 + Math.floor(0.7 * 18); // 2 + 12 = 14 e's

			// Act: Generate a sheesh response
			const response = generateSheeshResponse();

			// Assert: Response should have the expected number of e's
			const expectedResponse = 'sh' + 'e'.repeat(expectedECount) + 'sh 😤';
			expect(response).toBe(expectedResponse);
		});

		it('should generate responses within the expected range', () => {
			// Arrange: Test boundary values
			// Act & Assert: Test minimum e's (random = 0)
			mockRandomValue = 0.0;
			let response = generateSheeshResponse();
			expect(response).toBe('sheesh 😤'); // 2 e's minimum

			// Act & Assert: Test maximum e's (random = 0.999...)
			mockRandomValue = 0.999;
			response = generateSheeshResponse();
			const expectedMaxECount = 2 + Math.floor(0.999 * 18); // 2 + 17 = 19 e's
			const expectedMaxResponse = 'sh' + 'e'.repeat(expectedMaxECount) + 'sh 😤';
			expect(response).toBe(expectedMaxResponse);
		});
	});

	describe('Bot Identity', () => {
		it('should have the correct bot name', () => {
			// Arrange: Get the bot instance
			const bot = sheeshBot;

			// Act: Check the bot name from the instance
			const botName = bot.name;

			// Assert: Bot should have the correct name
			expect(botName).toBe(SHEESH_BOT_NAME);
			expect(botName).toBe('Sheesh Bot');
		});

		it('should have the correct bot name constant', () => {
			// Arrange & Act: Check the bot name constant
			// Assert: Bot name constant should be correct
			expect(SHEESH_BOT_NAME).toBe('Sheesh Bot');
		});

		it('should have an avatar URL configured', () => {
			// Arrange & Act: Check the avatar URL constant
			// Assert: Bot should have an avatar URL
			expect(SHEESH_BOT_AVATAR_URL).toBeDefined();
			expect(SHEESH_BOT_AVATAR_URL).toContain('http');
		});
	});

	describe('Edge Cases', () => {
		it('should handle "sheesh" with punctuation', async () => {
			// Arrange: Create messages with "sheesh" and punctuation
			const message1 = mockMessage({ content: 'sheesh!' });
			const message2 = mockMessage({ content: 'sheesh?' });
			const message3 = mockMessage({ content: 'sheesh.' });
			const message4 = mockMessage({ content: 'sheesh,' });

			// Act: Check if the bot should respond
			const shouldRespond1 = await sheeshTrigger.condition(message1);
			const shouldRespond2 = await sheeshTrigger.condition(message2);
			const shouldRespond3 = await sheeshTrigger.condition(message3);
			const shouldRespond4 = await sheeshTrigger.condition(message4);

			// Assert: Bot should respond to "sheesh" with punctuation
			expect(shouldRespond1).toBe(true);
			expect(shouldRespond2).toBe(true);
			expect(shouldRespond3).toBe(true);
			expect(shouldRespond4).toBe(true);
		});

		it('should handle very long messages containing "sheesh"', async () => {
			// Arrange: Create a very long message with "sheesh"
			const longContent = 'This is a very long message that goes on and on and mentions sheesh somewhere in the middle of all this text';
			const message = mockMessage({ content: longContent });

			// Act: Check if the bot should respond
			const shouldRespond = await sheeshTrigger.condition(message);

			// Assert: Bot should respond even to long messages
			expect(shouldRespond).toBe(true);
		});

		it('should handle messages with multiple "sheesh" mentions', async () => {
			// Arrange: Create a message with multiple "sheesh" occurrences
			const message = mockMessage({ content: 'sheesh that was wild, sheesh indeed' });

			// Act: Check if the bot should respond
			const shouldRespond = await sheeshTrigger.condition(message);

			// Assert: Bot should respond to messages with multiple matches
			expect(shouldRespond).toBe(true);
		});

		it('should handle mixed case extended sheesh', async () => {
			// Arrange: Create messages with mixed case extended sheesh
			const message1 = mockMessage({ content: 'SHEEEEESH' });
			const message2 = mockMessage({ content: 'ShEeEeEsH' });

			// Act: Check if the bot should respond
			const shouldRespond1 = await sheeshTrigger.condition(message1);
			const shouldRespond2 = await sheeshTrigger.condition(message2);

			// Assert: Bot should respond to mixed case extended sheesh
			expect(shouldRespond1).toBe(true);
			expect(shouldRespond2).toBe(true);
		});

		it('should handle "sheesh" with special characters around it', async () => {
			// Arrange: Create messages with special characters
			const message1 = mockMessage({ content: '(sheesh)' });
			const message2 = mockMessage({ content: '[sheesh]' });
			const message3 = mockMessage({ content: '"sheesh"' });

			// Act: Check if the bot should respond
			const shouldRespond1 = await sheeshTrigger.condition(message1);
			const shouldRespond2 = await sheeshTrigger.condition(message2);
			const shouldRespond3 = await sheeshTrigger.condition(message3);

			// Assert: Bot should respond to "sheesh" with special characters around it
			expect(shouldRespond1).toBe(true);
			expect(shouldRespond2).toBe(true);
			expect(shouldRespond3).toBe(true);
		});
	});

	describe('Response Content Validation', () => {
		it('should always include the emoji in responses', async () => {
			// Arrange: Create a message that triggers the bot
			const message = mockMessage({ content: 'sheesh' });

			// Act: Generate multiple responses
			const responses = [];
			for (let i = 0; i < 10; i++) {
				mockRandomValue = Math.random(); // Use different random values
				responses.push(await sheeshTrigger.response(message));
			}

			// Assert: All responses should contain the emoji
			responses.forEach(response => {
				expect(response).toContain('😤');
			});
		});

		it('should always start with "sh" and end with "sh 😤"', async () => {
			// Arrange: Create a message that triggers the bot
			const message = mockMessage({ content: 'sheesh' });

			// Act: Generate multiple responses
			const responses = [];
			for (let i = 0; i < 10; i++) {
				mockRandomValue = Math.random(); // Use different random values
				responses.push(await sheeshTrigger.response(message));
			}

			// Assert: All responses should have correct format
			responses.forEach(response => {
				expect(response).toMatch(/^sh[e]+sh 😤$/);
			});
		});
	});
});
