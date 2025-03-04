// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock the bot constants
jest.mock('../botConstants', () => ({
	getBotName: jest.fn().mockReturnValue('PickleBot'),
	getBotAvatar: jest.fn().mockReturnValue('http://example.com/pickle.jpg'),
	getBotPattern: jest.fn().mockReturnValue(/\bpickle\b/i),
	getBotResponse: jest.fn().mockReturnValue('🥒'),
}));

import webhookService from '../../../webhooks/webhookService';
import PickleBot from '../reply-bots/pickleBot';
import { mockMessage, mockWebhookService } from './testUtils';

// Set up the mock implementation
jest.mocked(webhookService).writeMessage = mockWebhookService.writeMessage;

describe('PickleBot', () => {
	let pickleBot: PickleBot;

	beforeEach(() => {
		jest.clearAllMocks();
		pickleBot = new PickleBot();
	});

	test('should not respond to bot messages', async () => {
		// Arrange
		const botMessage = mockMessage('I turned myself into a pickle');
		botMessage.author.bot = true;

		// Act
		await pickleBot.handleMessage(botMessage);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should respond to messages containing "pickle"', async () => {
		// Arrange
		const message = mockMessage('I turned myself into a pickle');

		// Act
		await pickleBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalled();
	});
});
