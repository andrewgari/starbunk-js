import { Message } from 'discord.js';
import { WebhookService } from '../../src/webhooks/webhookService';
import { createExampleBot } from './exampleBot';

// Mock discord.js
jest.mock('discord.js', () => {
	return {
		Message: jest.fn().mockImplementation(() => ({}))
	};
});

// Mock WebhookService
const mockWebhookService = {
	writeMessage: jest.fn(),
	getWebhookName: jest.fn(),
	getChannelWebhook: jest.fn(),
	getWebhook: jest.fn()
} as unknown as jest.Mocked<WebhookService>;

// Create a simple mock message
const createMockMessage = (content: string): Message => {
	return {
		content,
		channelId: '123',
		webhookId: null,
		author: {
			username: 'testUser',
			id: 'userId'
		},
		client: {
			user: {
				id: 'clientId'
			}
		}
	} as unknown as Message;
};

describe('ExampleBot', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('ExampleBot responds to "foo" with "Bar"', async () => {
		// Create the example bot
		const exampleBot = createExampleBot(mockWebhookService);

		// Test with matching message
		await exampleBot.handleMessage(createMockMessage('foo'));
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			'123',
			'Bar',
			'Example Bot',
			'your_avatar_url_here'
		);
	});

	test('ExampleBot does not respond to non-matching message', async () => {
		// Create the example bot
		const exampleBot = createExampleBot(mockWebhookService);

		// Test with non-matching message
		await exampleBot.handleMessage(createMockMessage('hello world'));
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('ExampleBot does not respond to its own messages', async () => {
		// Create the example bot
		const exampleBot = createExampleBot(mockWebhookService);

		// Create a message that appears to be from the bot itself
		const mockMessage = createMockMessage('foo');
		mockMessage.webhookId = 'someId';
		mockMessage.author.username = 'Example Bot';

		// Test with self-message
		await exampleBot.handleMessage(mockMessage);
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('ExampleBot is case insensitive for "foo"', async () => {
		// Create the example bot
		const exampleBot = createExampleBot(mockWebhookService);

		// Test with different cases
		await exampleBot.handleMessage(createMockMessage('FOO'));
		expect(mockWebhookService.writeMessage).toHaveBeenCalledTimes(1);

		await exampleBot.handleMessage(createMockMessage('Foo'));
		expect(mockWebhookService.writeMessage).toHaveBeenCalledTimes(2);

		await exampleBot.handleMessage(createMockMessage('foO'));
		expect(mockWebhookService.writeMessage).toHaveBeenCalledTimes(3);
	});

	test('ExampleBot matches "foo" within larger text', async () => {
		// Create the example bot
		const exampleBot = createExampleBot(mockWebhookService);

		// Test with foo as part of larger text
		await exampleBot.handleMessage(createMockMessage('I said foo yesterday'));
		expect(mockWebhookService.writeMessage).toHaveBeenCalledTimes(1);

		await exampleBot.handleMessage(createMockMessage('prefix-foo-suffix'));
		expect(mockWebhookService.writeMessage).toHaveBeenCalledTimes(2);
	});
});
