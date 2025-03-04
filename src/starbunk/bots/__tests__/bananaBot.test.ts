// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Define mock responses
const mockResponses = [
	"Always bring a :banana: to a party, banana's are good!",
	"Don't drop the :banana:, they're a good source of potassium!",
];

// Mock the bot constants
jest.mock('../botConstants', () => ({
	getBotName: jest.fn().mockReturnValue('BananaBot'),
	getBotAvatar: jest.fn().mockReturnValue('http://example.com/banana.jpg'),
	getBotPattern: jest.fn().mockReturnValue(/banana/i),
	// We'll use the first response for simplicity
	getBotResponse: jest.fn().mockReturnValue(mockResponses[0]),
}));

import { TextChannel } from 'discord.js';
import webhookService from '../../../webhooks/webhookService';
import BananaBot from '../reply-bots/bananaBot';
import { mockMessage, mockWebhookService } from './testUtils';

// Set up the mock implementation
jest.mocked(webhookService).writeMessage = mockWebhookService.writeMessage;

describe('BananaBot', () => {
	let bananaBot: BananaBot;

	beforeEach(() => {
		bananaBot = new BananaBot();
		jest.clearAllMocks();
	});

	test('should not respond to bot messages', () => {
		// Arrange
		const botMessage = mockMessage('banana split');
		botMessage.author.bot = true;

		// Act
		bananaBot.handleMessage(botMessage);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should respond to messages containing "banana"', () => {
		// Arrange
		const message = mockMessage('I love banana bread');

		// Act
		bananaBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalledWith(
			message.channel as TextChannel,
			{
				username: 'BananaBot',
				avatarURL: 'http://example.com/banana.jpg',
				content: mockResponses[0],
				embeds: [],
			}
		);
	});

	test('should not respond to messages without "banana"', () => {
		// Arrange
		const message = mockMessage('hello world');

		// Act
		bananaBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});
});
