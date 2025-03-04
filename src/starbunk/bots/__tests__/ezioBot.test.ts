import { Message, TextChannel } from 'discord.js';
import webhookService from '../../../webhooks/webhookService';

// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock the bot constants
jest.mock('../botConstants', () => ({
	getBotName: jest.fn().mockReturnValue('EzioBot'),
	getBotAvatar: jest.fn().mockReturnValue('http://example.com/ezio.jpg'),
	getBotPattern: jest.fn().mockReturnValue(/\bezio|h?assassin.*\b/i),
	getBotResponse: jest.fn().mockReturnValue('Requiescat in pace'),
}));

import EzioBot from '../reply-bots/ezioBot';
import { mockWebhookService } from './testUtils';

// Set up the mock implementation
jest.mocked(webhookService).writeMessage = mockWebhookService.writeMessage;

const mockMessage = (content: string, isBot = false): Message<boolean> => ({
	content,
	author: { bot: isBot, displayName: 'TestUser' },
	channel: {} as TextChannel,
} as Message<boolean>);

describe('EzioBot', () => {
	let ezioBot: EzioBot;

	beforeEach(() => {
		jest.clearAllMocks();
		ezioBot = new EzioBot();
	});

	test('should not respond to bot messages', async () => {
		// Arrange
		const botMessage = mockMessage('ezio auditore');
		botMessage.author.bot = true;

		// Act
		await ezioBot.handleMessage(botMessage);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should respond to messages containing "ezio"', async () => {
		// Arrange
		const message = mockMessage('ezio auditore');

		// Act
		await ezioBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalled();
	});

	test('should respond to messages containing "assassin"', async () => {
		// Arrange
		const message = mockMessage('the assassin strikes at midnight');

		// Act
		await ezioBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalled();
	});
});
