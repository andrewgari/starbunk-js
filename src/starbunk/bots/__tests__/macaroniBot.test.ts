// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock the bot constants
jest.mock('../botConstants', () => ({
	getBotName: jest.fn().mockReturnValue('MacaroniBot'),
	getBotAvatar: jest.fn().mockReturnValue('http://example.com/macaroni.jpg'),
	getBotPattern: jest.fn().mockReturnValue(/macaroni/i),
	getBotResponse: jest.fn().mockReturnValue('🍝'),
}));

import { TextChannel } from 'discord.js';
import webhookService from '../../../webhooks/webhookService';
import MacaroniBot from '../reply-bots/macaroniBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

// Set up the mock implementation
jest.mocked(webhookService).writeMessage = mockWebhookService.writeMessage;

describe('MacaroniBot', () => {
	let macaroniBot: MacaroniBot;

	beforeEach(() => {
		macaroniBot = new MacaroniBot(mockLogger);
		jest.clearAllMocks();
	});

	test('should not respond to bot messages', () => {
		// Arrange
		const botMessage = mockMessage('macaroni and cheese');
		botMessage.author.bot = true;

		// Act
		macaroniBot.handleMessage(botMessage);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
		expect(mockLogger.debug).not.toHaveBeenCalled();
	});

	test('should respond to messages containing "macaroni"', () => {
		// Arrange
		const message = mockMessage('I love macaroni and cheese');
		message.author.username = 'TestUser';

		// Act
		macaroniBot.handleMessage(message);

		// Assert
		expect(mockLogger.debug).toHaveBeenCalledWith(
			expect.stringContaining('🍝 User TestUser mentioned macaroni')
		);
		expect(webhookService.writeMessage).toHaveBeenCalledWith(
			message.channel as TextChannel,
			{
				username: 'MacaroniBot',
				avatarURL: 'http://example.com/macaroni.jpg',
				content: '🍝',
				embeds: [],
			}
		);
	});

	test('should not respond to messages without "macaroni"', () => {
		// Arrange
		const message = mockMessage('hello world');

		// Act
		macaroniBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
		expect(mockLogger.debug).not.toHaveBeenCalled();
	});
});
