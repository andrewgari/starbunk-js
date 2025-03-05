// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock the bot constants
jest.mock('../botConstants', () => ({
	getBotName: jest.fn().mockReturnValue('ChaosBot'),
	getBotAvatar: jest.fn().mockReturnValue('http://example.com/chaos.jpg'),
	getBotPattern: jest.fn().mockReturnValue(/\bchaos\b/i),
	getBotResponse: jest.fn().mockReturnValue('CHAOS!'),
}));

import webhookService from '../../../webhooks/webhookService';
import ChaosBot from '../reply-bots/chaosBot';
import { mockMessage } from './testUtils';

// Set up the mock implementation
// The setupBotMocks() function in testUtils now handles this

describe('ChaosBot', () => {
	let chaosBot: ChaosBot;

	beforeEach(() => {
		jest.clearAllMocks();
		chaosBot = new ChaosBot();
	});

	test('should not respond to bot messages', async () => {
		// Arrange
		const botMessage = mockMessage('chaos reigns');
		botMessage.author.bot = true;

		// Act
		await chaosBot.handleMessage(botMessage);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should respond to messages containing "chaos"', async () => {
		// Arrange
		const message = mockMessage('chaos reigns');

		// Act
		await chaosBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalled();
	});
});
