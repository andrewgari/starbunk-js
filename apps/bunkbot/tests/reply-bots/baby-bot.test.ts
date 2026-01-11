import { mockMessage } from '../../src/test-utils/test-utils';
import babyBot from '../../src/reply-bots/baby-bot';
import { babyTrigger } from '../../src/reply-bots/baby-bot/triggers';
import { BABY_BOT_RESPONSES, BABY_BOT_NAME, BABY_BOT_AVATAR_URL } from '../../src/reply-bots/baby-bot/constants';

describe('Baby Bot', () => {
	describe('Condition Checking', () => {
		it('should respond to messages containing "baby"', async () => {
			// Arrange: Create a message with "baby" in it
			const message = mockMessage({ content: 'look at that baby' });

			// Act: Check if the trigger condition matches
			const shouldRespond = await babyTrigger.condition(message);

			// Assert: Bot should respond to messages containing "baby"
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "baby" at the beginning of a message', async () => {
			// Arrange: Create a message starting with "baby"
			const message = mockMessage({ content: 'baby steps are important' });

			// Act: Check if the trigger condition matches
			const shouldRespond = await babyTrigger.condition(message);

			// Assert: Bot should respond to this pattern
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "baby" at the end of a message', async () => {
			// Arrange: Create a message ending with "baby"
			const message = mockMessage({ content: "that's my baby" });

			// Act: Check if the trigger condition matches
			const shouldRespond = await babyTrigger.condition(message);

			// Assert: Bot should respond to this pattern
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "baby" as a standalone word', async () => {
			// Arrange: Create a message with just "baby"
			const message = mockMessage({ content: 'baby' });

			// Act: Check if the trigger condition matches
			const shouldRespond = await babyTrigger.condition(message);

			// Assert: Bot should respond to standalone "baby"
			expect(shouldRespond).toBe(true);
		});

		it('should be case insensitive', async () => {
			// Arrange: Create messages with different cases
			const upperMessage = mockMessage({ content: 'BABY SHARK' });
			const mixedMessage = mockMessage({ content: 'BaBy YoDa' });

			// Act: Check if the trigger condition matches
			const shouldRespondUpper = await babyTrigger.condition(upperMessage);
			const shouldRespondMixed = await babyTrigger.condition(mixedMessage);

			// Assert: Bot should respond regardless of case
			expect(shouldRespondUpper).toBe(true);
			expect(shouldRespondMixed).toBe(true);
		});

		it('should NOT respond to partial word matches', async () => {
			// Arrange: Create messages with "baby" as part of other words
			const message1 = mockMessage({ content: 'babysitter is here' });
			const message2 = mockMessage({ content: 'crybaby behavior' });

			// Act: Check if the bot should respond to these messages
			const shouldRespond1 = await babyTrigger.condition(message1);
			const shouldRespond2 = await babyTrigger.condition(message2);

			// Assert: Bot should NOT respond to partial matches
			expect(shouldRespond1).toBe(false);
			expect(shouldRespond2).toBe(false);
		});

		it('should NOT respond to messages without "baby"', async () => {
			// Arrange: Create a message without "baby"
			const message = mockMessage({ content: 'hello world' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await babyTrigger.condition(message);

			// Assert: Bot should NOT respond to messages without "baby"
			expect(shouldRespond).toBe(false);
		});

		it('should NOT respond to empty messages', async () => {
			// Arrange: Create an empty message
			const message = mockMessage({ content: '' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await babyTrigger.condition(message);

			// Assert: Bot should NOT respond to empty messages
			expect(shouldRespond).toBe(false);
		});

		it('should NOT respond to messages with only whitespace', async () => {
			// Arrange: Create a message with only whitespace
			const message = mockMessage({ content: '   \n\t  ' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await babyTrigger.condition(message);

			// Assert: Bot should NOT respond to whitespace-only messages
			expect(shouldRespond).toBe(false);
		});
	});

	describe('Response Generation', () => {
		it('should generate the correct baby response', async () => {
			// Arrange: Create a message that triggers the bot
			const message = mockMessage({ content: 'look at that baby' });

			// Act: Generate the response
			const response = await babyTrigger.response(message);

			// Assert: Response should be the expected baby GIF
			expect(response).toBe(BABY_BOT_RESPONSES.Default);
		});

		it('should generate consistent responses for different triggering messages', async () => {
			// Arrange: Create different messages that trigger the bot
			const message1 = mockMessage({ content: 'baby steps' });
			const message2 = mockMessage({ content: "that's my baby" });
			const message3 = mockMessage({ content: 'baby' });

			// Act: Generate responses for all messages
			const response1 = await babyTrigger.response(message1);
			const response2 = await babyTrigger.response(message2);
			const response3 = await babyTrigger.response(message3);

			// Assert: All responses should be the same baby GIF
			expect(response1).toBe(BABY_BOT_RESPONSES.Default);
			expect(response2).toBe(BABY_BOT_RESPONSES.Default);
			expect(response3).toBe(BABY_BOT_RESPONSES.Default);
		});

		it('should return a valid GIF URL', async () => {
			// Arrange: Create a message that triggers the bot
			const message = mockMessage({ content: 'baby' });

			// Act: Generate the response
			const response = await babyTrigger.response(message);

			// Assert: Response should be a valid URL
			expect(response).toContain('http');
			expect(response).toContain('.gif');
		});
	});

	describe('Bot Identity', () => {
		it('should have the correct bot name', () => {
			// Arrange: Get the bot instance
			const bot = babyBot;

			// Act: Check the bot name from the instance
			const botName = bot.name;

			// Assert: Bot should have the correct name
			expect(botName).toBe(BABY_BOT_NAME);
			expect(botName).toBe('BabyBot');
		});

		it('should have the correct bot name constant', () => {
			// Arrange & Act: Check the bot name constant
			// Assert: Bot name constant should be correct
			expect(BABY_BOT_NAME).toBe('BabyBot');
		});

		it('should have an avatar URL configured', () => {
			// Arrange & Act: Check the avatar URL constant
			// Assert: Bot should have an avatar URL
			expect(BABY_BOT_AVATAR_URL).toBeDefined();
			expect(BABY_BOT_AVATAR_URL).toContain('http');
		});
	});

	describe('Edge Cases', () => {
		it('should handle messages with special characters', async () => {
			// Arrange: Create a message with special characters
			const message = mockMessage({ content: 'baby @#$%^&*()' });

			// Act: Check if the bot should respond
			const shouldRespond = await babyTrigger.condition(message);

			// Assert: Bot should still respond to the pattern
			expect(shouldRespond).toBe(true);
		});

		it('should handle very long messages', async () => {
			// Arrange: Create a very long message with the pattern
			const longContent =
				'This is a very long message that goes on and on and mentions baby somewhere in the middle of all this text';
			const message = mockMessage({ content: longContent });

			// Act: Check if the bot should respond
			const shouldRespond = await babyTrigger.condition(message);

			// Assert: Bot should respond even to long messages
			expect(shouldRespond).toBe(true);
		});

		it('should handle messages with multiple "baby" mentions', async () => {
			// Arrange: Create a message with multiple "baby" words
			const message = mockMessage({ content: 'baby shark doo doo baby shark' });

			// Act: Check if the bot should respond
			const shouldRespond = await babyTrigger.condition(message);

			// Assert: Bot should respond to messages with multiple matches
			expect(shouldRespond).toBe(true);
		});

		it('should handle "baby" with punctuation', async () => {
			// Arrange: Create messages with "baby" followed by punctuation
			const message1 = mockMessage({ content: 'baby!' });
			const message2 = mockMessage({ content: 'baby?' });
			const message3 = mockMessage({ content: 'baby.' });

			// Act: Check if the bot should respond
			const shouldRespond1 = await babyTrigger.condition(message1);
			const shouldRespond2 = await babyTrigger.condition(message2);
			const shouldRespond3 = await babyTrigger.condition(message3);

			// Assert: Bot should respond to "baby" with punctuation
			expect(shouldRespond1).toBe(true);
			expect(shouldRespond2).toBe(true);
			expect(shouldRespond3).toBe(true);
		});
	});
});
