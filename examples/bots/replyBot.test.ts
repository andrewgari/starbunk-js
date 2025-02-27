import { Message } from 'discord.js';
import { WebhookService } from '../../../webhooks/webhookService';
import { TriggerCondition } from '../botTypes';
import { AndCondition, RegexCondition } from '../conditions';
import ReplyBot from '../replyBot';

// Mock WebhookService
const mockWebhookService = {
	writeMessage: jest.fn()
} as jest.Mocked<WebhookService>;

// Mock Message
const createMockMessage = (content: string): Partial<Message> => ({
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
});

describe('ReplyBot Examples', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	// Simple Example Bot with single regex condition
	test('Simple Example Bot responds to "Foo" with "Bar"', async () => {
		const simpleBot = new ReplyBot(
			{ name: 'SimpleBot', avatarUrl: 'url' },
			new RegexCondition(/foo/i),
			{ generateResponse: async () => 'Bar' },
			mockWebhookService
		);

		await simpleBot.handleMessage(createMockMessage('foo') as Message);
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			'123',
			'Bar',
			'SimpleBot',
			'url'
		);
	});

	// AND Condition Bot
	test('AND Condition Bot requires both conditions to be met', async () => {
		const andBot = new ReplyBot(
			{ name: 'AndBot', avatarUrl: 'url' },
			new AndCondition([
				new RegexCondition(/hello/i),
				new RegexCondition(/world/i)
			]),
			{ generateResponse: async () => 'Greetings!' },
			mockWebhookService
		);

		// Should trigger
		await andBot.handleMessage(createMockMessage('hello world') as Message);
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();

		// Should not trigger - only one condition met
		await andBot.handleMessage(createMockMessage('hello there') as Message);
		expect(mockWebhookService.writeMessage).toHaveBeenCalledTimes(1);
	});

	// Multi-Response Bot
	test('Multi-Response Bot can trigger different responses', async () => {
		const multiBot = new ReplyBot(
			{ name: 'MultiBot', avatarUrl: 'url' },
			new RegexCondition(/test/i),
			{ generateResponse: async () => 'Default Response' },
			mockWebhookService
		);

		const conditionMap = new Map<TriggerCondition, any>();
		conditionMap.set(new RegexCondition(/test1/i), {
			responseGenerator: { generateResponse: async () => 'Response 1' }
		});
		conditionMap.set(new RegexCondition(/test2/i), {
			responseGenerator: { generateResponse: async () => 'Response 2' }
		});

		multiBot.setMultiResponseEnabled(true);
		multiBot.setMultiResponseData(conditionMap, null);

		// Test different responses
		await multiBot.handleMessage(createMockMessage('test1') as Message);
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			'123',
			'Response 1',
			'MultiBot',
			'url'
		);
	});

	// Test bot doesn't respond to itself
	test('Bot does not respond to its own messages', async () => {
		const selfBot = new ReplyBot(
			{ name: 'SelfBot', avatarUrl: 'url' },
			new RegexCondition(/test/i),
			{ generateResponse: async () => 'Response' },
			mockWebhookService
		);

		const selfMessage = {
			...createMockMessage('test'),
			webhookId: 'someId',
			author: {
				username: 'SelfBot',
				id: 'userId'
			}
		};

		await selfBot.handleMessage(selfMessage as Message);
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
