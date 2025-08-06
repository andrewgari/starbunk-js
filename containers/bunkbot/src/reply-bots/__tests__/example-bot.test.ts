import { mockMessage, mockUser, mockDiscordService } from '../../test-utils/testUtils';
import ExampleBot from '../example-bot';
import { getDiscordService } from '@starbunk/shared';

// Mock the shared package
jest.mock('@starbunk/shared', () => ({
	...jest.requireActual('@starbunk/shared'),
	getDiscordService: jest.fn(),
}));

describe('Example Bot', () => {
	let mockDiscordServiceInstance: any;

	beforeEach(() => {
		// Create a fresh mock Discord service instance
		mockDiscordServiceInstance = mockDiscordService();
		(getDiscordService as jest.Mock).mockReturnValue(mockDiscordServiceInstance);
	});

	afterEach(() => {
		// Clean up environment variables after each test
		delete process.env.E2E_TEST_USER_ID;
		delete process.env.TEST_BOT_USER_ID;
		jest.clearAllMocks();
	});

	describe('E2E Test Client Support', () => {
		it('should process E2E test client messages (runtime detection)', async () => {
			const testClientId = '123456789012345678';
			const message = mockMessage({
				content: 'example test message', // This should trigger the bot
				author: mockUser({ id: testClientId }),
				client: {
					user: mockUser({ id: testClientId })
				}
			});

			await ExampleBot.processMessage(message);

			// Should process the message and send response
			expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).toHaveBeenCalledWith(
				message.channel.id,
				expect.objectContaining({ botName: 'ExampleBot' }),
				'This is an example response with custom filtering!'
			);
		});

		it('should process E2E test client messages even with short content', async () => {
			const testClientId = '123456789012345678';
			const message = mockMessage({
				content: 'ex', // This would normally be filtered out for being too short
				author: mockUser({ id: testClientId }),
				client: {
					user: mockUser({ id: testClientId })
				}
			});

			await ExampleBot.processMessage(message);

			// Should process the message despite being short (E2E test client priority)
			// But won't trigger because it doesn't match "example" or "simple" pattern
			expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).not.toHaveBeenCalled();
		});

		it('should process E2E test client messages even with spam content', async () => {
			const testClientId = '123456789012345678';
			const message = mockMessage({
				content: 'example spam message', // Contains both trigger and spam word
				author: mockUser({ id: testClientId }),
				client: {
					user: mockUser({ id: testClientId })
				}
			});

			await ExampleBot.processMessage(message);

			// Should process the message and send response (E2E test client takes priority)
			expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).toHaveBeenCalledWith(
				message.channel.id,
				expect.objectContaining({ botName: 'ExampleBot' }),
				'This is an example response with custom filtering!'
			);
		});
	});

	describe('Message Filtering', () => {
		it('should filter out messages that are too short', async () => {
			const message = mockMessage({
				content: 'hi',
				author: mockUser({ id: '123456789012345678', username: 'RegularUser' })
			});

			await ExampleBot.processMessage(message);

			// Should not send any response (filtered out)
			expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).not.toHaveBeenCalled();
		});

		it('should filter out messages with spam keywords', async () => {
			const message = mockMessage({
				content: 'Check out this spam example',
				author: mockUser({ id: '123456789012345678', username: 'RegularUser' })
			});

			await ExampleBot.processMessage(message);

			// Should not send any response (filtered out due to spam)
			expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).not.toHaveBeenCalled();
		});

		it('should process valid messages that pass filters', async () => {
			const message = mockMessage({
				content: 'This is an example message',
				author: mockUser({ id: '123456789012345678', username: 'RegularUser' })
			});

			await ExampleBot.processMessage(message);

			// Should process the message and send response
			expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).toHaveBeenCalledWith(
				message.channel.id,
				expect.objectContaining({ botName: 'ExampleBot' }),
				'This is an example response with custom filtering!'
			);
		});

		it('should allow E2E test client messages (by name)', () => {
			const message = mockMessage({
				content: 'example test message',
				author: mockUser({ id: '123456789012345678', username: 'TestBot' })
			});

			const result = ExampleBot.messageFilter!(message);
			expect(result).toBe(false); // false means don't skip (allow)
		});

		it('should allow E2E test client messages (by environment variable)', () => {
			const testUserId = '123456789012345678';
			process.env.E2E_TEST_USER_ID = testUserId;

			const message = mockMessage({
				content: 'example test message',
				author: mockUser({ id: testUserId, username: 'RegularUser' })
			});

			const result = ExampleBot.messageFilter!(message);
			expect(result).toBe(false); // false means don't skip (allow)
		});

		it('should skip messages that are too short', () => {
			const message = mockMessage({
				content: 'hi',
				author: mockUser({ id: '123456789012345678', username: 'RegularUser' })
			});

			const result = ExampleBot.messageFilter!(message);
			expect(result).toBe(true); // true means skip
		});

		it('should allow messages that are long enough', () => {
			const message = mockMessage({
				content: 'this is a longer message',
				author: mockUser({ id: '123456789012345678', username: 'RegularUser' })
			});

			const result = ExampleBot.messageFilter!(message);
			expect(result).toBe(false); // false means don't skip (allow)
		});

		it('should skip excluded bot messages', () => {
			const message = mockMessage({
				content: 'test message from covabot',
				author: mockUser({ 
					id: '123456789012345678', 
					username: 'CovaBot',
					bot: true 
				})
			});

			const result = ExampleBot.messageFilter!(message);
			expect(result).toBe(true); // true means skip
		});

		it('should allow non-excluded bot messages', () => {
			const message = mockMessage({
				content: 'test message from other bot',
				author: mockUser({ 
					id: '123456789012345678', 
					username: 'SomeOtherBot',
					bot: true 
				})
			});

			const result = ExampleBot.messageFilter!(message);
			expect(result).toBe(false); // false means don't skip (allow)
		});

		it('should skip messages containing spam keywords', () => {
			const spamWords = ['spam', 'advertisement', 'buy now'];
			
			spamWords.forEach(spamWord => {
				const message = mockMessage({
					content: `This is a ${spamWord} message`,
					author: mockUser({ id: '123456789012345678', username: 'RegularUser' })
				});

				const result = ExampleBot.messageFilter!(message);
				expect(result).toBe(true); // true means skip
			});
		});

		it('should skip messages containing spam keywords case-insensitively', () => {
			const message = mockMessage({
				content: 'Check out this SPAM offer!',
				author: mockUser({ id: '123456789012345678', username: 'RegularUser' })
			});

			const result = ExampleBot.messageFilter!(message);
			expect(result).toBe(true); // true means skip
		});

		it('should allow messages without spam keywords', () => {
			const message = mockMessage({
				content: 'This is a normal message about cats',
				author: mockUser({ id: '123456789012345678', username: 'RegularUser' })
			});

			const result = ExampleBot.messageFilter!(message);
			expect(result).toBe(false); // false means don't skip (allow)
		});

		it('should handle whitespace-only messages', () => {
			const message = mockMessage({
				content: '   ',
				author: mockUser({ id: '123456789012345678', username: 'RegularUser' })
			});

			const result = ExampleBot.messageFilter!(message);
			expect(result).toBe(true); // true means skip (too short after trim)
		});

		it('should prioritize E2E test client detection over other filters', () => {
			const testClientId = '123456789012345678';
			const message = mockMessage({
				content: 'hi', // This would normally be too short
				author: mockUser({ id: testClientId }),
				client: {
					user: mockUser({ id: testClientId })
				}
			});

			const result = ExampleBot.messageFilter!(message);
			expect(result).toBe(false); // false means don't skip (E2E test client takes priority)
		});

		it('should prioritize E2E test client detection over spam detection', () => {
			const testClientId = '123456789012345678';
			const message = mockMessage({
				content: 'This is spam content',
				author: mockUser({ id: testClientId }),
				client: {
					user: mockUser({ id: testClientId })
				}
			});

			const result = ExampleBot.messageFilter!(message);
			expect(result).toBe(false); // false means don't skip (E2E test client takes priority)
		});

		it('should handle null/undefined message gracefully', () => {
			// This test ensures the messageFilter handles edge cases
			// The actual implementation should handle this, but we're testing the bot's integration
			const result = ExampleBot.messageFilter!(null as any);
			expect(result).toBe(false); // Should default to not skip
		});
	});

	describe('triggers', () => {
		it('should have a trigger that matches example and simple patterns', () => {
			expect(ExampleBot.triggers).toHaveLength(1);
			
			const trigger = ExampleBot.triggers[0];
			expect(trigger.name).toBe('example-trigger');
			expect(typeof trigger.condition).toBe('function');
			expect(typeof trigger.response).toBe('function');
			expect(trigger.priority).toBe(1);
		});

		it('should trigger on messages containing "example"', () => {
			const message = mockMessage({
				content: 'This is an example message',
				author: mockUser({ id: '123456789012345678', username: 'RegularUser' })
			});

			const trigger = ExampleBot.triggers[0];
			const result = trigger.condition(message);
			expect(result).toBe(true);
		});

		it('should trigger on messages containing "simple"', () => {
			const message = mockMessage({
				content: 'This is a simple message',
				author: mockUser({ id: '123456789012345678', username: 'RegularUser' })
			});

			const trigger = ExampleBot.triggers[0];
			const result = trigger.condition(message);
			expect(result).toBe(true);
		});

		it('should not trigger on messages without example or simple', () => {
			const message = mockMessage({
				content: 'This is a regular message',
				author: mockUser({ id: '123456789012345678', username: 'RegularUser' })
			});

			const trigger = ExampleBot.triggers[0];
			const result = trigger.condition(message);
			expect(result).toBe(false);
		});

		it('should return expected response', () => {
			const trigger = ExampleBot.triggers[0];
			const response = trigger.response();
			expect(response).toBe('This is an example response with custom filtering!');
		});
	});

	describe('bot metadata', () => {
		it('should have correct name and description', () => {
			expect(ExampleBot.name).toBe('ExampleBot');
			expect(ExampleBot.description).toBe('An example bot with custom message filtering');
		});

		it('should have 100% response rate', () => {
			expect(ExampleBot.responseRate).toBe(100);
		});

		it('should have default identity configured', () => {
			expect(ExampleBot.defaultIdentity).toBeDefined();
			expect(ExampleBot.defaultIdentity.botName).toBe('ExampleBot');
		});
	});
});