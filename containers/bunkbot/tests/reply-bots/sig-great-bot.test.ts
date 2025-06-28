import { mockMessage, mockUser } from '../../src/test-utils/testUtils';
import sigGreatBot from '../../src/reply-bots/sig-great-bot';
import { sigGreatTrigger } from '../../src/reply-bots/sig-great-bot/triggers';
import { SIG_GREAT_RESPONSE, SIG_GREAT_BOT_NAME, SIG_GREAT_BOT_AVATAR_URL } from '../../src/reply-bots/sig-great-bot/constants';

describe('Sig Great Bot', () => {
	describe('Condition Checking - Pattern Matching', () => {
		it('should respond to "sig is great"', async () => {
			// Arrange: Create a message with "sig is great"
			const message = mockMessage({ content: 'sig is great' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await sigGreatTrigger.condition(message);

			// Assert: Bot should respond to this pattern
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "sig is best"', async () => {
			// Arrange: Create a message with "sig is best"
			const message = mockMessage({ content: 'sig is best' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await sigGreatTrigger.condition(message);

			// Assert: Bot should respond to this pattern
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "siggles is awesome"', async () => {
			// Arrange: Create a message with "siggles is awesome"
			const message = mockMessage({ content: 'siggles is awesome' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await sigGreatTrigger.condition(message);

			// Assert: Bot should respond to this pattern
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "sig greatest" without "is"', async () => {
			// Arrange: Create a message with "sig greatest"
			const message = mockMessage({ content: 'sig greatest' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await sigGreatTrigger.condition(message);

			// Assert: Bot should respond to this pattern
			expect(shouldRespond).toBe(true);
		});

		it('should respond to various positive adjectives', async () => {
			// Arrange: Create messages with different positive adjectives
			const adjectives = ['best', 'greatest', 'awesome', 'amazing', 'cool', 'fantastic', 'wonderful', 'excellent', 'good', 'great', 'brilliant', 'perfect'];
			
			for (const adjective of adjectives) {
				const message = mockMessage({ content: `sig is ${adjective}` });

				// Act: Check if the bot should respond
				const shouldRespond = await sigGreatTrigger.condition(message);

				// Assert: Bot should respond to all positive adjectives
				expect(shouldRespond).toBe(true);
			}
		});

		it('should respond to "sig is the best"', async () => {
			// Arrange: Create a message with "sig is the best"
			const message = mockMessage({ content: 'sig is the best' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await sigGreatTrigger.condition(message);

			// Assert: Bot should respond to this pattern
			expect(shouldRespond).toBe(true);
		});

		it('should be case insensitive', async () => {
			// Arrange: Create messages with different cases
			const upperMessage = mockMessage({ content: 'SIG IS GREAT' });
			const mixedMessage = mockMessage({ content: 'SiG iS AwEsOmE' });

			// Act: Check if the bot should respond to these messages
			const shouldRespondUpper = await sigGreatTrigger.condition(upperMessage);
			const shouldRespondMixed = await sigGreatTrigger.condition(mixedMessage);

			// Assert: Bot should respond regardless of case
			expect(shouldRespondUpper).toBe(true);
			expect(shouldRespondMixed).toBe(true);
		});

		it('should use word boundaries for "sig"', async () => {
			// Arrange: Create messages where "sig" is part of other words
			const message1 = mockMessage({ content: 'signature is great' });
			const message2 = mockMessage({ content: 'design is awesome' });

			// Act: Check if the bot should respond to these messages
			const shouldRespond1 = await sigGreatTrigger.condition(message1);
			const shouldRespond2 = await sigGreatTrigger.condition(message2);

			// Assert: Bot should NOT respond to partial matches
			expect(shouldRespond1).toBe(false);
			expect(shouldRespond2).toBe(false);
		});

		it('should NOT respond to negative statements about sig', async () => {
			// Arrange: Create messages with negative statements
			const message1 = mockMessage({ content: 'sig is bad' });
			const message2 = mockMessage({ content: 'sig is terrible' });
			const message3 = mockMessage({ content: 'sig is worst' });

			// Act: Check if the bot should respond to these messages
			const shouldRespond1 = await sigGreatTrigger.condition(message1);
			const shouldRespond2 = await sigGreatTrigger.condition(message2);
			const shouldRespond3 = await sigGreatTrigger.condition(message3);

			// Assert: Bot should NOT respond to negative statements
			expect(shouldRespond1).toBe(false);
			expect(shouldRespond2).toBe(false);
			expect(shouldRespond3).toBe(false);
		});

		it('should NOT respond to messages without the pattern', async () => {
			// Arrange: Create a message without the sig pattern
			const message = mockMessage({ content: 'hello world' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await sigGreatTrigger.condition(message);

			// Assert: Bot should NOT respond to messages without the pattern
			expect(shouldRespond).toBe(false);
		});

		it('should NOT respond to empty messages', async () => {
			// Arrange: Create an empty message
			const message = mockMessage({ content: '' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await sigGreatTrigger.condition(message);

			// Assert: Bot should NOT respond to empty messages
			expect(shouldRespond).toBe(false);
		});

		it('should NOT respond to messages with only whitespace', async () => {
			// Arrange: Create a message with only whitespace
			const message = mockMessage({ content: '   \n\t  ' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await sigGreatTrigger.condition(message);

			// Assert: Bot should NOT respond to whitespace-only messages
			expect(shouldRespond).toBe(false);
		});
	});

	describe('Response Generation', () => {
		it('should generate the correct sig great response', async () => {
			// Arrange: Create a message that triggers the bot
			const message = mockMessage({ content: 'sig is great' });

			// Act: Generate the response
			const response = await sigGreatTrigger.response(message);

			// Assert: Response should be the expected sig great message
			expect(response).toBe(SIG_GREAT_RESPONSE, SIG_GREAT_BOT_NAME, SIG_GREAT_BOT_AVATAR_URL);
		});

		it('should generate consistent responses for different triggering messages', async () => {
			// Arrange: Create different messages that trigger the bot
			const message1 = mockMessage({ content: 'sig is best' });
			const message2 = mockMessage({ content: 'siggles is awesome' });
			const message3 = mockMessage({ content: 'sig greatest' });

			// Act: Generate responses for all messages
			const response1 = await sigGreatTrigger.response(message1);
			const response2 = await sigGreatTrigger.response(message2);
			const response3 = await sigGreatTrigger.response(message3);

			// Assert: All responses should be the same sig great message
			expect(response1).toBe(SIG_GREAT_RESPONSE, SIG_GREAT_BOT_NAME, SIG_GREAT_BOT_AVATAR_URL);
			expect(response2).toBe(SIG_GREAT_RESPONSE, SIG_GREAT_BOT_NAME, SIG_GREAT_BOT_AVATAR_URL);
			expect(response3).toBe(SIG_GREAT_RESPONSE, SIG_GREAT_BOT_NAME, SIG_GREAT_BOT_AVATAR_URL);
		});

		it('should return the exact expected response text', async () => {
			// Arrange: Create a message that triggers the bot
			const message = mockMessage({ content: 'sig is great' });

			// Act: Generate the response
			const response = await sigGreatTrigger.response(message);

			// Assert: Response should be exactly the expected text
			expect(response).toBe('Yeah, Sig is pretty great! :wink:');
		});
	});

	describe('Bot Identity', () => {
		it('should have the correct bot name', () => {
			// Arrange: Get the bot instance
			const bot = sigGreatBot;

			// Act: Check the bot name from the instance
			const botName = bot.name;

			// Assert: Bot should have the correct name
			expect(botName).toBe(SIG_GREAT_BOT_NAME);
			expect(botName).toBe('SigGreatBot');
		});
});
});
