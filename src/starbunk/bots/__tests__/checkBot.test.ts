// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock the bot constants
jest.mock('../botConstants', () => ({
	getBotName: jest.fn().mockReturnValue('CheckBot'),
	getBotAvatar: jest.fn().mockReturnValue('http://example.com/check.jpg'),
	getBotPattern: jest.fn().mockReturnValue(/\bcheck\b/i),
	getBotResponse: jest.fn().mockReturnValue('✓'),
}));

import { TextChannel } from 'discord.js';
import webhookService from '../../../webhooks/webhookService';
import CheckBot from '../reply-bots/checkBot';
import { mockMessage, mockWebhookService } from './testUtils';

// Set up the mock implementation
jest.mocked(webhookService).writeMessage = mockWebhookService.writeMessage;

describe('CheckBot', () => {
	let checkBot: CheckBot;

	beforeEach(() => {
		checkBot = new CheckBot();
		jest.clearAllMocks();
	});

	test('should not respond to bot messages', () => {
		// Arrange
		const botMessage = mockMessage('check this out');
		botMessage.author.bot = true;

		// Act
		checkBot.handleMessage(botMessage);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should respond to messages containing "check"', () => {
		// Arrange
		const message = mockMessage('please check this code');

		// Act
		checkBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalledWith(
			message.channel as TextChannel,
			{
				username: 'CheckBot',
				avatarURL: 'http://example.com/check.jpg',
				content: '✓',
				embeds: [],
			}
		);
	});

	test('should not respond to messages without "check"', () => {
		// Arrange
		const message = mockMessage('hello world');

		// Act
		checkBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});
});
