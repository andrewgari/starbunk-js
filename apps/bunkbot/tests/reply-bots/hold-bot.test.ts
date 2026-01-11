import { mockMessage } from '../../src/test-utils/test-utils';
import holdBot from '../../src/reply-bots/hold-bot';
import { holdTrigger } from '../../src/reply-bots/hold-bot/triggers';
import { HOLD_RESPONSE, HOLD_BOT_NAME, HOLD_AVATAR_URL } from '../../src/reply-bots/hold-bot/constants';

describe('Hold Bot', () => {
	describe('Condition Checking - Exact Pattern Matching', () => {
		it('should respond to exactly "Hold"', async () => {
			// Arrange: Create a message with exactly "Hold"
			const message = mockMessage({ content: 'Hold' });

			// Act: Check if the trigger condition matches
			const shouldRespond = await holdTrigger.condition(message);

			// Assert: Bot should respond to exact "Hold"
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "Hold." with period', async () => {
			// Arrange: Create a message with "Hold."
			const message = mockMessage({ content: 'Hold.' });

			// Act: Check if the trigger condition matches
			const shouldRespond = await holdTrigger.condition(message);

			// Assert: Bot should respond to "Hold." with period
			expect(shouldRespond).toBe(true);
		});

		it('should be case insensitive', async () => {
			// Arrange: Create messages with different cases
			const upperMessage = mockMessage({ content: 'HOLD' });
			const lowerMessage = mockMessage({ content: 'hold' });
			const mixedMessage = mockMessage({ content: 'HoLd' });

			// Act: Check if the trigger condition matches
			const shouldRespondUpper = await holdTrigger.condition(upperMessage);
			const shouldRespondLower = await holdTrigger.condition(lowerMessage);
			const shouldRespondMixed = await holdTrigger.condition(mixedMessage);

			// Assert: Bot should respond regardless of case
			expect(shouldRespondUpper).toBe(true);
			expect(shouldRespondLower).toBe(true);
			expect(shouldRespondMixed).toBe(true);
		});

		it('should NOT respond to "Hold" with extra text', async () => {
			// Arrange: Create messages with "Hold" plus extra text
			const message1 = mockMessage({ content: 'Hold on' });
			const message2 = mockMessage({ content: 'Please Hold' });
			const message3 = mockMessage({ content: 'Hold tight' });

			// Act: Check if the trigger condition matches
			const shouldRespond1 = await holdTrigger.condition(message1);
			const shouldRespond2 = await holdTrigger.condition(message2);
			const shouldRespond3 = await holdTrigger.condition(message3);

			// Assert: Bot should NOT respond to "Hold" with extra text
			expect(shouldRespond1).toBe(false);
			expect(shouldRespond2).toBe(false);
			expect(shouldRespond3).toBe(false);
		});

		it('should NOT respond to messages without "Hold"', async () => {
			// Arrange: Create messages without "Hold"
			const message1 = mockMessage({ content: 'hello world' });
			const message2 = mockMessage({ content: 'stop' });
			const message3 = mockMessage({ content: 'wait' });

			// Act: Check if the trigger condition matches
			const shouldRespond1 = await holdTrigger.condition(message1);
			const shouldRespond2 = await holdTrigger.condition(message2);
			const shouldRespond3 = await holdTrigger.condition(message3);

			// Assert: Bot should NOT respond to messages without "Hold"
			expect(shouldRespond1).toBe(false);
			expect(shouldRespond2).toBe(false);
			expect(shouldRespond3).toBe(false);
		});

		it('should NOT respond to empty messages', async () => {
			// Arrange: Create an empty message
			const message = mockMessage({ content: '' });

			// Act: Check if the trigger condition matches
			const shouldRespond = await holdTrigger.condition(message);

			// Assert: Bot should NOT respond to empty messages
			expect(shouldRespond).toBe(false);
		});

		it('should NOT respond to messages with only whitespace', async () => {
			// Arrange: Create a message with only whitespace
			const message = mockMessage({ content: '   \n\t  ' });

			// Act: Check if the trigger condition matches
			const shouldRespond = await holdTrigger.condition(message);

			// Assert: Bot should NOT respond to whitespace-only messages
			expect(shouldRespond).toBe(false);
		});
	});

	describe('Response Generation', () => {
		it('should generate the correct hold response', async () => {
			// Arrange: Create a message that triggers the bot
			const message = mockMessage({ content: 'Hold' });

			// Act: Generate the response using the trigger
			const response = await holdTrigger.response(message);

			// Assert: Response should be the expected hold message
			expect(response).toBe(HOLD_RESPONSE);
			expect(response).toBe('Hold.');
		});

		it('should generate consistent responses for different triggering messages', async () => {
			// Arrange: Create different messages that trigger the bot
			const message1 = mockMessage({ content: 'Hold' });
			const message2 = mockMessage({ content: 'HOLD' });
			const message3 = mockMessage({ content: 'hold.' });

			// Act: Generate responses for all messages using the trigger
			const response1 = await holdTrigger.response(message1);
			const response2 = await holdTrigger.response(message2);
			const response3 = await holdTrigger.response(message3);

			// Assert: All responses should be the same hold message
			expect(response1).toBe(HOLD_RESPONSE);
			expect(response2).toBe(HOLD_RESPONSE);
			expect(response3).toBe(HOLD_RESPONSE);
		});
	});

	describe('Bot Identity', () => {
		it('should have the correct bot name', () => {
			// Arrange: Get the bot instance
			const bot = holdBot;

			// Act: Check the bot name from the instance
			const botName = bot.name;

			// Assert: Bot should have the correct name
			expect(botName).toBe(HOLD_BOT_NAME);
			expect(botName).toBe('HoldBot');
		});

		it('should have the correct bot name constant', () => {
			// Arrange & Act: Check the bot name constant
			// Assert: Bot name constant should be correct
			expect(HOLD_BOT_NAME).toBe('HoldBot');
		});

		it('should have an avatar URL configured', () => {
			// Arrange & Act: Check the avatar URL constant
			// Assert: Bot should have an avatar URL
			expect(HOLD_AVATAR_URL).toBeDefined();
			expect(HOLD_AVATAR_URL).toContain('http');
		});
	});

	describe('Response Content Validation', () => {
		it('should have a valid response constant', () => {
			// Arrange & Act: Check the response constant
			// Assert: Response should be valid
			expect(HOLD_RESPONSE).toBeDefined();
			expect(typeof HOLD_RESPONSE).toBe('string');
			expect(HOLD_RESPONSE).toBe('Hold.');
		});
	});
});
