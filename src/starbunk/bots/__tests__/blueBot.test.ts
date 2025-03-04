// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock userID
jest.mock('../../../discord/userID', () => ({
	Venn: 'venn123',
}));

// Mock the OpenAIClient
jest.mock('../../../openai/openaiClient', () => ({
	OpenAIClient: {
		chat: {
			completions: {
				create: jest.fn().mockResolvedValue({
					choices: [{ message: { content: 'yes' } }],
				}),
			},
		},
	},
}));

// Mock the bot constants
jest.mock('../botConstants', () => ({
	getBotName: jest.fn().mockReturnValue('BlueBot'),
	getBotAvatar: jest.fn().mockReturnValue('http://example.com/blue.jpg'),
	getBotPattern: jest.fn().mockReturnValue(/\bblue\b/i),
	getBotResponse: jest.fn().mockReturnValue('Blue!'),
}));

import { OpenAIClient } from '../../../openai/openaiClient';
import webhookService from '../../../webhooks/webhookService';
import BlueBot from '../reply-bots/blueBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

// Set up the mock implementation
jest.mocked(webhookService).writeMessage = mockWebhookService.writeMessage;

describe('BlueBot', () => {
	let blueBot: BlueBot;

	beforeEach(() => {
		jest.clearAllMocks();
		blueBot = new BlueBot(mockLogger);
	});

	test('should not respond to bot messages', async () => {
		// Arrange
		const botMessage = mockMessage('blue is my favorite color');
		botMessage.author.bot = true;

		// Act
		await blueBot.handleMessage(botMessage);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should respond to messages containing "blue"', async () => {
		// Arrange
		const message = mockMessage('blue is my favorite color');

		// Act
		await blueBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalled();
	});

	test('should not call AI check if pattern match is found', async () => {
		// Arrange
		const message = mockMessage('blue is my favorite color');

		// Clear the mock before this specific test
		(OpenAIClient.chat.completions.create as jest.Mock).mockClear();

		// Act
		await blueBot.handleMessage(message);

		// Assert
		expect(OpenAIClient.chat.completions.create).not.toHaveBeenCalled();
	});
});
