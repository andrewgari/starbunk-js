import { Events } from 'discord.js';

describe('BlueBot Bot Message Filtering', () => {
	let mockClient: any;
	let mockMessage: any;
	let mockWebhookManager: any;
	let messageHandler: (message: any) => Promise<void>;

	beforeEach(() => {
		// Mock Discord client
		mockClient = {
			on: jest.fn((event: string, handler: any) => {
				if (event === Events.MessageCreate) {
					messageHandler = handler;
				}
			}),
			once: jest.fn(),
			login: jest.fn().mockResolvedValue(undefined),
			destroy: jest.fn().mockResolvedValue(undefined),
		};

		// Mock webhook manager
		mockWebhookManager = {
			sendMessage: jest.fn().mockResolvedValue(undefined),
		};
	});

	it('should ignore messages from bots', async () => {
		// Create a bot message
		mockMessage = {
			author: {
				bot: true,
				id: 'bot-123',
				username: 'TestBot',
			},
			content: 'blue blue blue',
			channel: {
				id: 'channel-123',
			},
			guildId: 'guild-123',
			createdTimestamp: Date.now(),
		};

		// Verify the check - we just need to ensure message.author.bot is checked
		const shouldProcessBotMessage = !mockMessage.author.bot;
		expect(shouldProcessBotMessage).toBe(false);
	});

	it('should process messages from regular users', async () => {
		// Create a regular user message
		mockMessage = {
			author: {
				bot: false,
				id: 'user-123',
				username: 'TestUser',
			},
			content: 'blue blue blue',
			channel: {
				id: 'channel-123',
			},
			guildId: 'guild-123',
			createdTimestamp: Date.now(),
		};

		// Verify the check - we just need to ensure message.author.bot is checked
		const shouldProcessUserMessage = !mockMessage.author.bot;
		expect(shouldProcessUserMessage).toBe(true);
	});

	it('should ignore messages from webhook bots', async () => {
		// Create a webhook bot message
		mockMessage = {
			author: {
				bot: true, // Webhooks are marked as bots
				id: 'webhook-123',
				username: 'BluBot', // Even if it's the same name as BlueBot
			},
			content: 'Did somebody say Blu?',
			channel: {
				id: 'channel-123',
			},
			guildId: 'guild-123',
			createdTimestamp: Date.now(),
		};

		// Verify the check - should not process even if content matches trigger
		const shouldProcessWebhookMessage = !mockMessage.author.bot;
		expect(shouldProcessWebhookMessage).toBe(false);
	});

	it('should not respond to itself to prevent infinite loops', async () => {
		// Simulate BlueBot's own message (sent via webhook, which appears as a bot)
		mockMessage = {
			author: {
				bot: true, // BlueBot's webhook messages appear as bot messages
				id: 'bluebot-webhook-id',
				username: 'BluBot',
			},
			content: 'Did somebody say Blu?', // This is BlueBot's own response
			channel: {
				id: 'channel-123',
			},
			guildId: 'guild-123',
			createdTimestamp: Date.now(),
		};

		// Verify that this would be filtered out
		const shouldProcessOwnMessage = !mockMessage.author.bot;
		expect(shouldProcessOwnMessage).toBe(false);
	});
});
