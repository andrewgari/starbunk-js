import { mockMessage } from '../../src/test-utils/testUtils';
import attitudeBot from '../../src/reply-bots/attitude-bot';
import { attitudeTrigger } from '../../src/reply-bots/attitude-bot/triggers';
import {
	ATTITUDE_BOT_RESPONSES,
	ATTITUDE_BOT_NAME,
	ATTITUDE_BOT_AVATAR_URL,
} from '../../src/reply-bots/attitude-bot/constants';

describe('Attitude Bot', () => {
	describe('Condition Checking', () => {
		it('should respond to "you can\'t" statements', async () => {
			// Arrange: Create a message with "you can't" pattern
			const message = mockMessage({ content: "you can't do that" });

			// Act: Check if the trigger condition matches
			const shouldRespond = await attitudeTrigger.condition(message);

			// Assert: Bot should respond to this pattern
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "I can\'t" statements', async () => {
			// Arrange: Create a message with "I can't" pattern
			const message = mockMessage({ content: "I can't believe this" });

			// Act: Check if the trigger condition matches
			const shouldRespond = await attitudeTrigger.condition(message);

			// Assert: Bot should respond to this pattern
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "they can\'t" statements', async () => {
			// Arrange: Create a message with "they can't" pattern
			const message = mockMessage({ content: "they can't handle it" });

			// Act: Check if the trigger condition matches
			const shouldRespond = await attitudeTrigger.condition(message);

			// Assert: Bot should respond to this pattern
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "we can\'t" statements', async () => {
			// Arrange: Create a message with "we can't" pattern
			const message = mockMessage({ content: "we can't go there" });

			// Act: Check if the trigger condition matches
			const shouldRespond = await attitudeTrigger.condition(message);

			// Assert: Bot should respond to this pattern
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "you cant" without apostrophe', async () => {
			// Arrange: Create a message with "you cant" pattern (no apostrophe)
			const message = mockMessage({ content: 'you cant do that' });

			// Act: Check if the trigger condition matches
			const shouldRespond = await attitudeTrigger.condition(message);

			// Assert: Bot should respond to this pattern
			expect(shouldRespond).toBe(true);
		});

		it('should be case insensitive', async () => {
			// Arrange: Create a message with uppercase pattern
			const message = mockMessage({ content: "YOU CAN'T STOP ME" });

			// Act: Check if the trigger condition matches
			const shouldRespond = await attitudeTrigger.condition(message);

			// Assert: Bot should respond regardless of case
			expect(shouldRespond).toBe(true);
		});

		it('should NOT respond to messages without the pattern', async () => {
			// Arrange: Create a message without the "can't" pattern
			const message = mockMessage({ content: 'hello world' });

			// Act: Check if the trigger condition matches
			const shouldRespond = await attitudeTrigger.condition(message);

			// Assert: Bot should NOT respond to this message
			expect(shouldRespond).toBe(false);
		});

		it('should NOT respond to partial matches', async () => {
			// Arrange: Create a message with partial match that shouldn't trigger
			const message = mockMessage({ content: 'cantaloupe is delicious' });

			// Act: Check if the trigger condition matches
			const shouldRespond = await attitudeTrigger.condition(message);

			// Assert: Bot should NOT respond to partial matches
			expect(shouldRespond).toBe(false);
		});

		it('should NOT respond to empty messages', async () => {
			// Arrange: Create an empty message
			const message = mockMessage({ content: '' });

			// Act: Check if the trigger condition matches
			const shouldRespond = await attitudeTrigger.condition(message);

			// Assert: Bot should NOT respond to empty messages
			expect(shouldRespond).toBe(false);
		});

		it('should NOT respond to messages with only whitespace', async () => {
			// Arrange: Create a message with only whitespace
			const message = mockMessage({ content: '   \n\t  ' });

			// Act: Check if the trigger condition matches
			const shouldRespond = await attitudeTrigger.condition(message);

			// Assert: Bot should NOT respond to whitespace-only messages
			expect(shouldRespond).toBe(false);
		});
	});

	describe('Response Generation', () => {
		it('should generate the correct attitude response', async () => {
			// Arrange: Create a message that triggers the bot
			const message = mockMessage({ content: "you can't do that" });

			// Act: Generate the response using the trigger
			const response = await attitudeTrigger.response(message);

			// Assert: Response should be the expected attitude message
			expect(response).toBe(ATTITUDE_BOT_RESPONSES.Default);
		});

		it('should generate consistent responses for different triggering messages', async () => {
			// Arrange: Create different messages that trigger the bot
			const message1 = mockMessage({ content: "I can't believe it" });
			const message2 = mockMessage({ content: "they can't handle this" });
			const message3 = mockMessage({ content: "we can't go there" });

			// Act: Generate responses for all messages using the trigger
			const response1 = await attitudeTrigger.response(message1);
			const response2 = await attitudeTrigger.response(message2);
			const response3 = await attitudeTrigger.response(message3);

			// Assert: All responses should be the same attitude message
			expect(response1).toBe(ATTITUDE_BOT_RESPONSES.Default);
			expect(response2).toBe(ATTITUDE_BOT_RESPONSES.Default);
			expect(response3).toBe(ATTITUDE_BOT_RESPONSES.Default);
		});
	});

	describe('Bot Identity', () => {
		it('should have the correct bot name', () => {
			// Arrange: Get the bot instance
			const bot = attitudeBot;

			// Act: Check the bot name from the instance
			const botName = bot.name;

			// Assert: Bot should have the correct name
			expect(botName).toBe(ATTITUDE_BOT_NAME);
			expect(botName).toBe('Xander Crews');
		});

		it('should have the correct bot name constant', () => {
			// Arrange & Act: Check the bot name constant
			// Assert: Bot name constant should be correct
			expect(ATTITUDE_BOT_NAME).toBe('Xander Crews');
		});

		it('should have an avatar URL configured', () => {
			// Arrange & Act: Check the avatar URL constant
			// Assert: Bot should have an avatar URL
			expect(ATTITUDE_BOT_AVATAR_URL).toBeDefined();
			expect(ATTITUDE_BOT_AVATAR_URL).toContain('http');
			expect(ATTITUDE_BOT_AVATAR_URL).toContain('ytimg.com');
		});
	});

	describe('Edge Cases', () => {
		it('should handle messages with special characters', async () => {
			// Arrange: Create a message with special characters
			const message = mockMessage({ content: "you can't @#$%^&*()" });

			// Act: Check if the trigger condition matches
			const shouldRespond = await attitudeTrigger.condition(message);

			// Assert: Bot should still respond to the pattern
			expect(shouldRespond).toBe(true);
		});

		it('should handle very long messages', async () => {
			// Arrange: Create a very long message with the pattern
			const longContent =
				"This is a very long message that goes on and on and on and you can't stop it from being really really long with lots of text";
			const message = mockMessage({ content: longContent });

			// Act: Check if the trigger condition matches
			const shouldRespond = await attitudeTrigger.condition(message);

			// Assert: Bot should respond even to long messages
			expect(shouldRespond).toBe(true);
		});

		it('should handle messages with multiple pattern matches', async () => {
			// Arrange: Create a message with multiple "can't" patterns
			const message = mockMessage({ content: "you can't do this and I can't do that" });

			// Act: Check if the trigger condition matches
			const shouldRespond = await attitudeTrigger.condition(message);

			// Assert: Bot should respond to messages with multiple matches
			expect(shouldRespond).toBe(true);
		});
	});
});
