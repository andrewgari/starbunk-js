import { mockMessage } from '../../src/test-utils/testUtils';
import niceBot from '../../src/reply-bots/nice-bot';
import { niceTrigger } from '../../src/reply-bots/nice-bot/triggers';
import { NICE_BOT_RESPONSES, NICE_BOT_NAME, NICE_BOT_AVATAR_URL } from '../../src/reply-bots/nice-bot/constants';

describe('Nice Bot', () => {
	describe('Condition Checking - Pattern Matching', () => {
		it('should respond to messages containing "69"', async () => {
			// Arrange: Create a message with "69" in it
			const message = mockMessage({ content: 'The temperature is 69 degrees' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await niceTrigger.condition(message);

			// Assert: Bot should respond to messages containing "69"
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "69" at the beginning of a message', async () => {
			// Arrange: Create a message starting with "69"
			const message = mockMessage({ content: '69 is a number' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await niceTrigger.condition(message);

			// Assert: Bot should respond to this pattern
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "69" at the end of a message', async () => {
			// Arrange: Create a message ending with "69"
			const message = mockMessage({ content: 'The answer is 69' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await niceTrigger.condition(message);

			// Assert: Bot should respond to this pattern
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "69" as a standalone word', async () => {
			// Arrange: Create a message with just "69"
			const message = mockMessage({ content: '69' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await niceTrigger.condition(message);

			// Assert: Bot should respond to standalone "69"
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "sixty-nine" (with hyphen)', async () => {
			// Arrange: Create a message with "sixty-nine"
			const message = mockMessage({ content: 'I counted sixty-nine items' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await niceTrigger.condition(message);

			// Assert: Bot should respond to "sixty-nine"
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "sixtynine" (without hyphen)', async () => {
			// Arrange: Create a message with "sixtynine"
			const message = mockMessage({ content: 'I counted sixtynine items' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await niceTrigger.condition(message);

			// Assert: Bot should respond to "sixtynine"
			expect(shouldRespond).toBe(true);
		});

		it('should be case insensitive', async () => {
			// Arrange: Create messages with different cases
			const upperMessage = mockMessage({ content: 'SIXTY-NINE DEGREES' });
			const mixedMessage = mockMessage({ content: 'SiXtY-NiNe' });

			// Act: Check if the bot should respond to these messages
			const shouldRespondUpper = await niceTrigger.condition(upperMessage);
			const shouldRespondMixed = await niceTrigger.condition(mixedMessage);

			// Assert: Bot should respond regardless of case
			expect(shouldRespondUpper).toBe(true);
			expect(shouldRespondMixed).toBe(true);
		});

		it('should respond to "69" with word boundaries', async () => {
			// Arrange: Create messages with "69" as complete word
			const message1 = mockMessage({ content: 'Room 69 is available' });
			const message2 = mockMessage({ content: 'The score was 69-42' });
			const message3 = mockMessage({ content: 'Number: 69.' });

			// Act: Check if the bot should respond to these messages
			const shouldRespond1 = await niceTrigger.condition(message1);
			const shouldRespond2 = await niceTrigger.condition(message2);
			const shouldRespond3 = await niceTrigger.condition(message3);

			// Assert: Bot should respond to "69" with word boundaries
			expect(shouldRespond1).toBe(true);
			expect(shouldRespond2).toBe(true);
			expect(shouldRespond3).toBe(true);
		});

		it('should NOT respond to "69" as part of larger numbers', async () => {
			// Arrange: Create messages with "69" as part of larger numbers
			const message1 = mockMessage({ content: 'The year 1969 was important' });
			const message2 = mockMessage({ content: 'Call 6969 for help' });
			const message3 = mockMessage({ content: 'Address: 690 Main St' });

			// Act: Check if the bot should respond to these messages
			const shouldRespond1 = await niceTrigger.condition(message1);
			const shouldRespond2 = await niceTrigger.condition(message2);
			const shouldRespond3 = await niceTrigger.condition(message3);

			// Assert: Bot should NOT respond to "69" as part of larger numbers
			expect(shouldRespond1).toBe(false);
			expect(shouldRespond2).toBe(false);
			expect(shouldRespond3).toBe(false);
		});

		it('should NOT respond to messages without the pattern', async () => {
			// Arrange: Create a message without "69" or "sixty-nine"
			const message = mockMessage({ content: 'hello world' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await niceTrigger.condition(message);

			// Assert: Bot should NOT respond to messages without the pattern
			expect(shouldRespond).toBe(false);
		});

		it('should NOT respond to empty messages', async () => {
			// Arrange: Create an empty message
			const message = mockMessage({ content: '' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await niceTrigger.condition(message);

			// Assert: Bot should NOT respond to empty messages
			expect(shouldRespond).toBe(false);
		});

		it('should NOT respond to messages with only whitespace', async () => {
			// Arrange: Create a message with only whitespace
			const message = mockMessage({ content: '   \n\t  ' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await niceTrigger.condition(message);

			// Assert: Bot should NOT respond to whitespace-only messages
			expect(shouldRespond).toBe(false);
		});
	});

	describe('Response Generation', () => {
		it('should generate the correct "Nice." response', async () => {
			// Arrange: Create a message that triggers the bot
			const message = mockMessage({ content: 'The temperature is 69 degrees' });

			// Act: Generate the response
			const response = await niceTrigger.response(message);

			// Assert: Response should be "Nice."
			expect(response).toBe(NICE_BOT_RESPONSES.Default);
		});

		it('should generate consistent responses for different triggering messages', async () => {
			// Arrange: Create different messages that trigger the bot
			const message1 = mockMessage({ content: '69' });
			const message2 = mockMessage({ content: 'sixty-nine items' });
			const message3 = mockMessage({ content: 'Room 69 is ready' });

			// Act: Generate responses for all messages
			const response1 = await niceTrigger.response(message1);
			const response2 = await niceTrigger.response(message2);
			const response3 = await niceTrigger.response(message3);

			// Assert: All responses should be the same "Nice." message
			expect(response1).toBe(NICE_BOT_RESPONSES.Default);
			expect(response2).toBe(NICE_BOT_RESPONSES.Default);
			expect(response3).toBe(NICE_BOT_RESPONSES.Default);
		});

		it('should return exactly "Nice."', async () => {
			// Arrange: Create a message that triggers the bot
			const message = mockMessage({ content: '69' });

			// Act: Generate the response
			const response = await niceTrigger.response(message);

			// Assert: Response should be exactly "Nice."
			expect(response).toBe('Nice.');
		});
	});

	describe('Bot Identity', () => {
		it('should have the correct bot name', () => {
			// Arrange: Get the bot instance
			const bot = niceBot;

			// Act: Check the bot name from the instance
			const botName = bot.name;

			// Assert: Bot should have the correct name
			expect(botName).toBe(NICE_BOT_NAME);
			expect(botName).toBe('BunkBot');
		});
});
});
