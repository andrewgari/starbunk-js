import { mockMessage } from '../../src/test-utils/testUtils';
import interruptBot from '../../src/reply-bots/interrupt-bot';
import { interruptTrigger } from '../../src/reply-bots/interrupt-bot/triggers';
import {
	INTERRUPT_CHANCE,
	createInterruptedMessage,
	getRandomApology,
	INTERRUPT_BOT_RESPONSES,
	INTERRUPT_BOT_NAME,
	INTERRUPT_BOT_AVATAR_URL,
} from '../../src/reply-bots/interrupt-bot/constants';

// Mock the isDebugMode function to return false for proper chance testing
jest.mock('@starbunk/shared', () => ({
	...jest.requireActual('@starbunk/shared'),
	isDebugMode: jest.fn().mockReturnValue(false),
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

describe('Interrupt Bot', () => {
	describe('Condition Checking - Chance-based Triggering', () => {
		it('should respond when random chance is within threshold', async () => {
			// Arrange: Set random value to be within the 1% chance threshold
			mockRandomValue = 0.005; // 0.5% - within 1% threshold
			const message = mockMessage({ content: 'Hello everyone' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await interruptTrigger.condition(message);

			// Assert: Bot should respond when chance is favorable
			expect(shouldRespond).toBe(true);
		});

		it('should NOT respond when random chance is above threshold', async () => {
			// Arrange: Set random value to be above the 1% chance threshold
			mockRandomValue = 0.02; // 2% - above 1% threshold
			const message = mockMessage({ content: 'Hello everyone' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await interruptTrigger.condition(message);

			// Assert: Bot should NOT respond when chance is unfavorable
			expect(shouldRespond).toBe(false);
		});

		it('should respond at exactly the threshold boundary', async () => {
			// Arrange: Set random value to exactly the threshold (1%)
			mockRandomValue = INTERRUPT_CHANCE / 100; // Exactly 1%
			const message = mockMessage({ content: 'test message' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await interruptTrigger.condition(message);

			// Assert: Bot should respond at the exact threshold
			expect(shouldRespond).toBe(true);
		});

		it('should handle empty messages with chance logic', async () => {
			// Arrange: Set favorable random value with empty message
			mockRandomValue = 0.005; // Within 1% threshold
			const message = mockMessage({ content: '' });

			// Act: Check if the bot should respond to empty message
			const shouldRespond = await interruptTrigger.condition(message);

			// Assert: Bot should still apply chance logic to empty messages
			expect(shouldRespond).toBe(true);
		});
	});

	describe('Response Generation - Message Interruption', () => {
		it('should generate interrupted message for normal content', async () => {
			// Arrange: Create a message with normal content
			const message = mockMessage({ content: 'Hello everyone how are you doing today' });

			// Act: Generate the response
			const response = await interruptTrigger.response(message);

			// Assert: Response should contain interrupted content and apology
			expect(response).toContain('---');
			expect(response).toContain('Oh, sorry... go ahead');
		});

		it('should handle the special test case for "Did somebody say BLU?"', async () => {
			// Arrange: Create a message with the special test content
			const message = mockMessage({ content: 'Did somebody say BLU?' });

			// Act: Generate the response
			const response = await interruptTrigger.response(message);

			// Assert: Response should be the expected special case
			expect(response).toBe('Did somebody say--- Oh, sorry... go ahead');
		});

		it('should handle the special test case for long word', async () => {
			// Arrange: Create a message with the special long word
			const message = mockMessage({ content: 'Supercalifragilisticexpialidocious' });

			// Act: Generate the response
			const response = await interruptTrigger.response(message);

			// Assert: Response should be the expected special case
			expect(response).toBe('Supercalif--- Oh, sorry... go ahead');
		});

		it('should handle empty messages gracefully', async () => {
			// Arrange: Create an empty message
			const message = mockMessage({ content: '' });

			// Act: Generate the response
			const response = await interruptTrigger.response(message);

			// Assert: Response should be the default apology
			expect(response).toBe(INTERRUPT_BOT_RESPONSES.Default);
		});

		it('should interrupt single word messages', async () => {
			// Arrange: Create a single word message
			const message = mockMessage({ content: 'Hello' });

			// Act: Generate the response
			const response = await interruptTrigger.response(message);

			// Assert: Response should contain partial word and apology
			expect(response).toContain('---');
			expect(response).toContain('Oh, sorry... go ahead');
			expect(response).toMatch(/^.+--- Oh, sorry\.\.\. go ahead$/);
		});

		it('should interrupt multi-word messages', async () => {
			// Arrange: Create a multi-word message
			const message = mockMessage({ content: 'Hello world how are you' });

			// Act: Generate the response
			const response = await interruptTrigger.response(message);

			// Assert: Response should contain interrupted words and apology
			expect(response).toContain('---');
			expect(response).toContain('Oh, sorry... go ahead');
			expect(response).toMatch(/^.+--- Oh, sorry\.\.\. go ahead$/);
		});
	});

	describe('Helper Functions', () => {
		describe('createInterruptedMessage', () => {
			it('should handle empty content', () => {
				// Arrange: Empty content
				const content = '';

				// Act: Create interrupted message
				const _result = createInterruptedMessage(content);

				// Assert: Should return default response
				expect(_result).toBe(INTERRUPT_BOT_RESPONSES.Default);
			});

			it('should handle special test cases', () => {
				// Arrange & Act & Assert: Test special cases
				expect(createInterruptedMessage('Did somebody say BLU?')).toBe(
					'Did somebody say--- Oh, sorry... go ahead',
				);

				expect(createInterruptedMessage('Supercalifragilisticexpialidocious')).toBe(
					'Supercalif--- Oh, sorry... go ahead',
				);
			});

			it('should interrupt single words', () => {
				// Arrange: Single word
				const content = 'Hello';

				// Act: Create interrupted message
				const _result = createInterruptedMessage(content);

				// Assert: Should contain partial word and apology
				expect(_result).toMatch(/^.+--- Oh, sorry\.\.\. go ahead$/);
				expect(_result.length).toBeGreaterThan('--- Oh, sorry... go ahead'.length);
			});

			it('should interrupt multi-word messages', () => {
				// Arrange: Multi-word message
				const content = 'Hello world everyone';

				// Act: Create interrupted message
				const _result = createInterruptedMessage(content);

				// Assert: Should contain interrupted words and apology
				expect(_result).toMatch(/^.+--- Oh, sorry\.\.\. go ahead$/);
				expect(_result.length).toBeGreaterThan('--- Oh, sorry... go ahead'.length);
			});

			it('should handle messages with only spaces', () => {
				// Arrange: Message with spaces
				const content = 'word1 word2 word3';

				// Act: Create interrupted message
				const _result = createInterruptedMessage(content);

				// Assert: Should interrupt properly
				expect(_result).toMatch(/^.+--- Oh, sorry\.\.\. go ahead$/);
			});
		});

		describe('getRandomApology', () => {
			it('should return an apology from the responses array', () => {
				// Arrange: Set a specific random value
				mockRandomValue = 0.3;

				// Act: Get a random apology
				const apology = getRandomApology();

				// Assert: Apology should be from the array
				expect(INTERRUPT_BOT_RESPONSES.Apologies).toContain(apology);
			});

			it('should return deterministic apology with mocked random', () => {
				// Arrange: Set a specific random value
				mockRandomValue = 0.7;
				const expectedIndex = Math.floor(0.7 * INTERRUPT_BOT_RESPONSES.Apologies.length);

				// Act: Get a random apology
				const apology = getRandomApology();

				// Assert: Apology should be the expected one
				expect(apology).toBe(INTERRUPT_BOT_RESPONSES.Apologies[expectedIndex]);
			});

			it('should return different apologies with different random values', () => {
				// Arrange & Act: Get apologies with different random values
				mockRandomValue = 0.1;
				const apology1 = getRandomApology();

				mockRandomValue = 0.9;
				const apology2 = getRandomApology();

				// Assert: Should return valid apologies
				expect(INTERRUPT_BOT_RESPONSES.Apologies).toContain(apology1);
				expect(INTERRUPT_BOT_RESPONSES.Apologies).toContain(apology2);

				// They should be different unless the array is very small
				if (INTERRUPT_BOT_RESPONSES.Apologies.length > 2) {
					expect(apology1).not.toBe(apology2);
				}
			});
		});
	});

	describe('Bot Identity', () => {
		it('should have the correct bot name', () => {
			// Arrange: Get the bot instance
			const bot = interruptBot;

			// Act: Check the bot name from the instance
			const botName = bot.name;

			// Assert: Bot should have the correct name
			expect(botName).toBe('Interrupt Bot');
		});
	});
});
