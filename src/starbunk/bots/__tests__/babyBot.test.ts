// Mock the webhook service
jest.mock('../../../webhooks/webhookService', () => ({
	writeMessage: jest.fn()
}));

// Mock the BabyBotConfig to ensure it returns a consistent response
jest.mock('../config/BabyBotConfig', () => ({
	BabyBotConfig: {
		Name: 'BabyBot',
		Avatars: {
			Default: 'https://i.redd.it/qc9qus78dc581.jpg'
		},
		Patterns: {
			Default: /\bbaby\b/i
		},
		Responses: {
			Default: 'https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus-aran.gif'
		}
	}
}));

import { Message } from 'discord.js';
import container from '../../../services/ServiceContainer';
import { ServiceRegistry } from '../../../services/ServiceRegistry';
import BabyBot from '../reply-bots/babyBot';
import { createMockMessage, MockWebhookService, setupTestContainer } from './testUtils';

describe('BabyBot', () => {
	let babyBot: BabyBot;
	let message: Message<boolean>;
	let mockWebhookService: MockWebhookService;

	beforeEach(() => {
		jest.clearAllMocks();
		// Set up container with mock services
		setupTestContainer();
		// Get the mock webhook service from the container
		mockWebhookService = container.get(ServiceRegistry.WEBHOOK_SERVICE) as MockWebhookService;
		// Create bot after setting up container
		babyBot = new BabyBot();
		// Create a mock message
		message = createMockMessage('test message', '123456', false);
	});

	it('should not respond to bot messages', async () => {
		// Arrange
		message.author.bot = true;

		// Act
		await babyBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond to messages matching the pattern', async () => {
		// Arrange
		message.content = 'look at the baby over there';

		// Spy on the sendReply method
		const sendReplySpy = jest.spyOn(babyBot, 'sendReply');

		// Act
		await babyBot.handleMessage(message);

		// Assert
		expect(/\bbaby\b/i.test(message.content)).toBe(true);
		expect(sendReplySpy).toHaveBeenCalled();
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should not respond to messages not matching the pattern', async () => {
		// Arrange
		message.content = 'hello world';

		// Act
		await babyBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond with the correct message', async () => {
		// Arrange
		message.content = 'baby shark doo doo';

		// Act
		await babyBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				content: 'https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus-aran.gif'
			})
		);
	});
});
