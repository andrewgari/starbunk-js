// Mock the webhook service
jest.mock('../../../webhooks/webhookService', () => ({
	writeMessage: jest.fn()
}));

// Mock the random utility
jest.mock('../../../utils/random', () => ({
	percentChance: jest.fn().mockReturnValue(true),
}));

// Mock the getCurrentMemberIdentity function
jest.mock('../../../discord/discordGuildMemberHelper', () => ({
	getCurrentMemberIdentity: jest.fn().mockResolvedValue({
		avatarUrl: 'https://i.imgur.com/1234567890.png'
	})
}));

// Mock VennBotConfig to ensure it returns a consistent response
jest.mock('../config/VennBotConfig', () => ({
	VennBotConfig: {
		Name: 'VennBot',
		Responses: {
			Default: jest.fn().mockReturnValue('Mock response')
		}
	}
}));

import { Message } from 'discord.js';
// Import test dependencies

import userID from '../../../discord/userID';
import container from '../../../services/ServiceContainer';
import { ServiceRegistry } from '../../../services/ServiceRegistry';
import random from '../../../utils/random';
import VennBot from '../reply-bots/vennBot';
import { createMockMessage, MockWebhookService, setupTestContainer } from './testUtils';

describe.only('VennBot', () => {
	let vennBot: VennBot;
	let message: Message<boolean>;
	let mockWebhookService: MockWebhookService;

	beforeEach(() => {
		jest.clearAllMocks();
		// Set up container with mock services
		setupTestContainer();
		// Get the mock webhook service from the container
		mockWebhookService = container.get(ServiceRegistry.WEBHOOK_SERVICE) as MockWebhookService;
		// Create bot after setting up container
		vennBot = new VennBot();
		// Create a mock message
		message = createMockMessage('test message with vennBot', '123456', false);
	});

	it('should not respond to bot messages', async () => {
		// Arrange
		message.author.bot = true;

		// Act
		await vennBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond to messages matching the pattern', async () => {
		// Arrange
		message.content = 'cringe';

		// Spy on the sendReply method
		const sendReplySpy = jest.spyOn(vennBot, 'sendReply');

		// Act
		await vennBot.handleMessage(message);

		// Assert
		expect(/cringe/.test(message.content)).toBe(true);
		expect(sendReplySpy).toHaveBeenCalled();
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should not respond to messages not matching the pattern', async () => {
		// Arrange
		message.content = 'hello world';

		// Act
		await vennBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond to venn 5% of the time', async () => {
		// Arrange
		message.author.id = userID.Venn;

		// mock percentChance to return true
		jest.spyOn(random, 'percentChance').mockReturnValue(true);

		// Act
		await vennBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledTimes(1);
	});
});
