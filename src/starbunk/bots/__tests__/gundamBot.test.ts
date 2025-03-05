// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock the bot constants
jest.mock('../botConstants', () => ({
	getBotName: jest.fn().mockReturnValue('GundamBot'),
	getBotAvatar: jest.fn().mockReturnValue('http://example.com/gundam.jpg'),
	getBotPattern: jest.fn().mockReturnValue(/\bgundam\b/i),
	getBotResponse: jest.fn().mockReturnValue('Gundam!'),
}));

import webhookService from '../../../webhooks/webhookService';
import GundamBot from '../reply-bots/gundamBot';
import { mockMessage } from './testUtils';

// Set up the mock implementation
// The setupBotMocks() function in testUtils now handles this

describe('GundamBot', () => {
	let gundamBot: GundamBot;

	beforeEach(() => {
		jest.clearAllMocks();
		gundamBot = new GundamBot();
	});

	test('should not respond to bot messages', async () => {
		// Arrange
		const botMessage = mockMessage('I love gundam');
		botMessage.author.bot = true;

		// Act
		await gundamBot.handleMessage(botMessage);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should respond to messages containing "gundam"', async () => {
		// Arrange
		const message = mockMessage('I love gundam');

		// Act
		await gundamBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalled();
	});
});
