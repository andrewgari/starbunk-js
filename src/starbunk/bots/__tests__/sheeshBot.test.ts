// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock the bot constants
jest.mock('../botConstants', () => ({
	getBotName: jest.fn().mockReturnValue('SheeshBot'),
	getBotAvatar: jest.fn().mockReturnValue('http://example.com/sheesh.jpg'),
	getBotPattern: jest.fn().mockReturnValue(/\bsheesh\b/i),
	getBotResponse: jest.fn().mockReturnValue('SHEEEESH!'),
}));

import webhookService from '../../../webhooks/webhookService';
import SheeshBot from '../reply-bots/sheeshBot';
import { mockMessage } from './testUtils';

// Set up the mock implementation
// The setupBotMocks() function in testUtils now handles this

describe('SheeshBot', () => {
	let sheeshBot: SheeshBot;

	beforeEach(() => {
		jest.clearAllMocks();
		sheeshBot = new SheeshBot();
	});

	test('should not respond to bot messages', async () => {
		// Arrange
		const botMessage = mockMessage('sheesh that was cool');
		botMessage.author.bot = true;

		// Act
		await sheeshBot.handleMessage(botMessage);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should respond to messages containing "sheesh"', async () => {
		// Arrange
		const message = mockMessage('sheesh that was cool');

		// Act
		await sheeshBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalled();
	});
});
