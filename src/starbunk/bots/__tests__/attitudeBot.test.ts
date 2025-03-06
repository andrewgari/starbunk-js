// Mock the webhook service
jest.mock('../../../webhooks/webhookService', () => ({
	writeMessage: jest.fn()
}));

// Mock the AttitudeBotConfig to ensure it returns a consistent response
jest.mock('../config/AttitudeBotConfig', () => ({
	AttitudeBotConfig: {
		Name: 'Xander Crews',
		Avatars: {
			Default: 'https://i.ytimg.com/vi/56PMgO3q2-A/sddefault.jpg'
		},
		Patterns: {
			Default: /(you|I|they|we) can'?t/mi
		},
		Responses: {
			Default: 'Well, not with *THAT* attitude!!!'
		}
	}
}));

import { Message } from 'discord.js';
import container from '../../../services/ServiceContainer';
import { ServiceRegistry } from '../../../services/ServiceRegistry';
import AttitudeBot from '../reply-bots/attitudeBot';
import { createMockMessage, MockWebhookService, setupTestContainer } from './testUtils';

describe('AttitudeBot', () => {
	let attitudeBot: AttitudeBot;
	let message: Message<boolean>;
	let mockWebhookService: MockWebhookService;

	beforeEach(() => {
		jest.clearAllMocks();
		// Set up container with mock services
		setupTestContainer();
		// Get the mock webhook service from the container
		mockWebhookService = container.get(ServiceRegistry.WEBHOOK_SERVICE) as MockWebhookService;
		// Create bot after setting up container
		attitudeBot = new AttitudeBot();
		// Create a mock message
		message = createMockMessage('test message', '123456', false);
	});

	it('should not respond to bot messages', async () => {
		// Arrange
		message.author.bot = true;

		// Act
		await attitudeBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond to messages matching the pattern', async () => {
		// Arrange
		message.content = 'I can\'t believe this';

		// Spy on the sendReply method
		const sendReplySpy = jest.spyOn(attitudeBot, 'sendReply');

		// Act
		await attitudeBot.handleMessage(message);

		// Assert
		expect(/(you|I|they|we) can'?t/mi.test(message.content)).toBe(true);
		expect(sendReplySpy).toHaveBeenCalled();
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should not respond to messages not matching the pattern', async () => {
		// Arrange
		message.content = 'hello world';

		// Act
		await attitudeBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond with the correct message', async () => {
		// Arrange
		message.content = 'You can\'t do that';

		// Act
		await attitudeBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				content: 'Well, not with *THAT* attitude!!!'
			})
		);
	});
});
