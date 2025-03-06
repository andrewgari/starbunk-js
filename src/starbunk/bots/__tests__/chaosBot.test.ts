// Mock the webhook service
jest.mock('../../../webhooks/webhookService', () => ({
	writeMessage: jest.fn()
}));

// Mock the ChaosBotConfig to ensure it returns a consistent response
jest.mock('../config/ChaosBotConfig', () => ({
	ChaosBotConfig: {
		Name: 'ChaosBot',
		Avatars: {
			Default: 'https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de'
		},
		Patterns: {
			Default: /\bchaos\b/i
		},
		Responses: {
			Default: "All I know is...I'm here to kill Chaos"
		}
	}
}));

import { Message } from 'discord.js';
import container from '../../../services/ServiceContainer';
import { ServiceRegistry } from '../../../services/ServiceRegistry';
import ChaosBot from '../reply-bots/chaosBot';
import { createMockMessage, MockWebhookService, setupTestContainer } from './testUtils';

describe('ChaosBot', () => {
	let chaosBot: ChaosBot;
	let message: Message<boolean>;
	let mockWebhookService: MockWebhookService;

	beforeEach(() => {
		jest.clearAllMocks();
		// Set up container with mock services
		setupTestContainer();
		// Get the mock webhook service from the container
		mockWebhookService = container.get(ServiceRegistry.WEBHOOK_SERVICE) as MockWebhookService;
		// Create bot after setting up container
		chaosBot = new ChaosBot();
		// Create a mock message
		message = createMockMessage('test message', '123456', false);
	});

	it('should not respond to bot messages', async () => {
		// Arrange
		message.author.bot = true;

		// Act
		await chaosBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond to messages matching the pattern', async () => {
		// Arrange
		message.content = 'There is so much chaos in this room';

		// Spy on the sendReply method
		const sendReplySpy = jest.spyOn(chaosBot, 'sendReply');

		// Act
		await chaosBot.handleMessage(message);

		// Assert
		expect(/\bchaos\b/i.test(message.content)).toBe(true);
		expect(sendReplySpy).toHaveBeenCalled();
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should not respond to messages not matching the pattern', async () => {
		// Arrange
		message.content = 'hello world';

		// Act
		await chaosBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond with the correct message', async () => {
		// Arrange
		message.content = 'chaos reigns';

		// Act
		await chaosBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				content: "All I know is...I'm here to kill Chaos"
			})
		);
	});
});
