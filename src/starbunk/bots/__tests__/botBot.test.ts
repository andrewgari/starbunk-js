// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock the random utility
jest.mock('../../../utils/random', () => ({
	percentChance: jest.fn().mockReturnValue(true),
}));

// Mock the bot constants
jest.mock('../botConstants', () => ({
	getBotName: jest.fn().mockReturnValue('BotBot'),
	getBotAvatar: jest.fn().mockReturnValue('http://example.com/bot.jpg'),
	getBotResponse: jest.fn().mockReturnValue('I am a bot!'),
}));

import random from '../../../utils/random';
import webhookService from '../../../webhooks/webhookService';
import BotBot from '../reply-bots/botBot';
import { mockMessage, mockWebhookService } from './testUtils';

// Set up the mock implementation
jest.mocked(webhookService).writeMessage = mockWebhookService.writeMessage;

describe('BotBot', () => {
	let botBot: BotBot;

	beforeEach(() => {
		jest.clearAllMocks();
		botBot = new BotBot();
	});

	test('should respond to bot messages with 10% chance', async () => {
		// Arrange
		const botMessage = mockMessage('I am a bot');
		botMessage.author.bot = true;
		(random.percentChance as jest.Mock).mockReturnValue(true);

		// Act
		await botBot.handleMessage(botMessage);

		// Assert
		expect(random.percentChance).toHaveBeenCalledWith(10);
		expect(webhookService.writeMessage).toHaveBeenCalled();
	});

	test('should not respond to bot messages if chance not hit', async () => {
		// Arrange
		const botMessage = mockMessage('I am a bot');
		botMessage.author.bot = true;
		(random.percentChance as jest.Mock).mockReturnValue(false);

		// Act
		await botBot.handleMessage(botMessage);

		// Assert
		expect(random.percentChance).toHaveBeenCalledWith(10);
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should not respond to non-bot messages', async () => {
		// Arrange
		const message = mockMessage('I am a human');
		message.author.bot = false;

		// Act
		await botBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});
});
