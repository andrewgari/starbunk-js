import { mockMessage } from '../../src/test-utils/testUtils';
import pickleBot from '../../src/reply-bots/pickle-bot';
import { pickleTrigger } from '../../src/reply-bots/pickle-bot/triggers';
import { PICKLE_BOT_RESPONSES, PICKLE_BOT_NAME, PICKLE_BOT_AVATAR_URL } from '../../src/reply-bots/pickle-bot/constants';

describe('Pickle Bot', () => {
	describe('Condition Checking - Pattern Matching', () => {
		it('should respond to messages containing "gremlin"', async () => {
			// Arrange: Create a message with "gremlin" in it
			const message = mockMessage({ content: 'that little gremlin is causing trouble' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await pickleTrigger.condition(message);

			// Assert: Bot should respond to messages containing "gremlin"
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "gremlin" at the beginning of a message', async () => {
			// Arrange: Create a message starting with "gremlin"
			const message = mockMessage({ content: 'gremlin mode activated' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await pickleTrigger.condition(message);

			// Assert: Bot should respond to this pattern
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "gremlin" at the end of a message', async () => {
			// Arrange: Create a message ending with "gremlin"
			const message = mockMessage({ content: 'you are such a gremlin' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await pickleTrigger.condition(message);

			// Assert: Bot should respond to this pattern
			expect(shouldRespond).toBe(true);
		});

		it('should respond to "gremlin" as a standalone word', async () => {
			// Arrange: Create a message with just "gremlin"
			const message = mockMessage({ content: 'gremlin' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await pickleTrigger.condition(message);

			// Assert: Bot should respond to standalone "gremlin"
			expect(shouldRespond).toBe(true);
		});

		it('should be case insensitive', async () => {
			// Arrange: Create messages with different cases
			const upperMessage = mockMessage({ content: 'GREMLIN ATTACK' });
			const mixedMessage = mockMessage({ content: 'GrEmLiN behavior' });

			// Act: Check if the bot should respond to these messages
			const shouldRespondUpper = await pickleTrigger.condition(upperMessage);
			const shouldRespondMixed = await pickleTrigger.condition(mixedMessage);

			// Assert: Bot should respond regardless of case
			expect(shouldRespondUpper).toBe(true);
			expect(shouldRespondMixed).toBe(true);
		});

		it('should respond to partial word matches (unlike word-boundary bots)', async () => {
			// Arrange: Create messages with "gremlin" as part of other words
			const message1 = mockMessage({ content: 'gremlins are everywhere' });
			const message2 = mockMessage({ content: 'gremlinlike behavior' });

			// Act: Check if the bot should respond to these messages
			const shouldRespond1 = await pickleTrigger.condition(message1);
			const shouldRespond2 = await pickleTrigger.condition(message2);

			// Assert: Bot should respond to partial matches (regex doesn't use word boundaries)
			expect(shouldRespond1).toBe(true);
			expect(shouldRespond2).toBe(true);
		});

		it('should NOT respond to messages without "gremlin"', async () => {
			// Arrange: Create a message without "gremlin"
			const message = mockMessage({ content: 'hello world' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await pickleTrigger.condition(message);

			// Assert: Bot should NOT respond to messages without "gremlin"
			expect(shouldRespond).toBe(false);
		});

		it('should NOT respond to empty messages', async () => {
			// Arrange: Create an empty message
			const message = mockMessage({ content: '' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await pickleTrigger.condition(message);

			// Assert: Bot should NOT respond to empty messages
			expect(shouldRespond).toBe(false);
		});

		it('should NOT respond to messages with only whitespace', async () => {
			// Arrange: Create a message with only whitespace
			const message = mockMessage({ content: '   \n\t  ' });

			// Act: Check if the bot should respond to this message
			const shouldRespond = await pickleTrigger.condition(message);

			// Assert: Bot should NOT respond to whitespace-only messages
			expect(shouldRespond).toBe(false);
		});

		it('should NOT respond to similar but different words', async () => {
			// Arrange: Create messages with similar but different words
			const message1 = mockMessage({ content: 'kremlin is in Russia' });
			const message2 = mockMessage({ content: 'trembling with fear' });
			const message3 = mockMessage({ content: 'gambling is risky' });

			// Act: Check if the bot should respond to these messages
			const shouldRespond1 = await pickleTrigger.condition(message1);
			const shouldRespond2 = await pickleTrigger.condition(message2);
			const shouldRespond3 = await pickleTrigger.condition(message3);

			// Assert: Bot should NOT respond to similar but different words
			expect(shouldRespond1).toBe(false);
			expect(shouldRespond2).toBe(false);
			expect(shouldRespond3).toBe(false);
		});
	});

	describe('Response Generation', () => {
		it('should generate the correct gremlin response', async () => {
			// Arrange: Create a message that triggers the bot
			const message = mockMessage({ content: 'that gremlin is annoying' });

			// Act: Generate the response
			const response = await pickleTrigger.response(message);

			// Assert: Response should be the expected gremlin message
			expect(response).toBe(PICKLE_BOT_RESPONSES, PICKLE_BOT_NAME, PICKLE_BOT_AVATAR_URL.Default);
		});

		it('should generate consistent responses for different triggering messages', async () => {
			// Arrange: Create different messages that trigger the bot
			const message1 = mockMessage({ content: 'gremlin' });
			const message2 = mockMessage({ content: 'little gremlin' });
			const message3 = mockMessage({ content: 'GREMLIN MODE' });

			// Act: Generate responses for all messages
			const response1 = await pickleTrigger.response(message1);
			const response2 = await pickleTrigger.response(message2);
			const response3 = await pickleTrigger.response(message3);

			// Assert: All responses should be the same gremlin message
			expect(response1).toBe(PICKLE_BOT_RESPONSES, PICKLE_BOT_NAME, PICKLE_BOT_AVATAR_URL.Default);
			expect(response2).toBe(PICKLE_BOT_RESPONSES, PICKLE_BOT_NAME, PICKLE_BOT_AVATAR_URL.Default);
			expect(response3).toBe(PICKLE_BOT_RESPONSES, PICKLE_BOT_NAME, PICKLE_BOT_AVATAR_URL.Default);
		});

		it('should return the exact expected response text', async () => {
			// Arrange: Create a message that triggers the bot
			const message = mockMessage({ content: 'gremlin' });

			// Act: Generate the response
			const response = await pickleTrigger.response(message);

			// Assert: Response should be exactly the expected text
			expect(response).toBe("Could you repeat that? I don't speak *gremlin*");
		});
	});

	describe('Bot Identity', () => {
		it('should have the correct bot name', () => {
			// Arrange: Get the bot instance
			const bot = picklebotBot;

			// Act: Check the bot name from the instance
			const botName = bot.name;

			// Assert: Bot should have the correct name
			expect(botName).toBe(PICKLE_BOT_NAME);
			expect(botName).toBe('GremlinBot');
		});
});
});
