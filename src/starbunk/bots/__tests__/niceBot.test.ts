// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock the bot constants
jest.mock('../botConstants', () => ({
	getBotName: jest.fn().mockReturnValue('NiceBot'),
	getBotAvatar: jest.fn().mockReturnValue('http://example.com/nice.jpg'),
	getBotPattern: jest.fn().mockReturnValue(/\bnice\b/i),
	getBotResponse: jest.fn().mockReturnValue('Nice!'),
}));

import webhookService from '../../../webhooks/webhookService';
import NiceBot from '../reply-bots/niceBot';
import { mockMessage, mockWebhookService } from './testUtils';

// Set up the mock implementation
jest.mocked(webhookService).writeMessage = mockWebhookService.writeMessage;

describe('NiceBot', () => {
	let niceBot: NiceBot;

	beforeEach(() => {
		jest.clearAllMocks();
		niceBot = new NiceBot();
	});

	test('should respond to messages containing "nice"', async () => {
		// Arrange
		const message = mockMessage('that was nice');

		// Act
		await niceBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalled();
	});

	test('should not respond to messages without "nice"', async () => {
		// Arrange
		const message = mockMessage('that was good');

		// Act
		await niceBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});
});
