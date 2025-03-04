// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock the bot constants
jest.mock('../botConstants', () => ({
	getBotName: jest.fn().mockReturnValue('Xander Crews'),
	getBotAvatar: jest.fn().mockReturnValue('https://i.ytimg.com/vi/56PMgO3q2-A/sddefault.jpg'),
	getBotPattern: jest.fn().mockReturnValue(/(you|I|they|we) can'?t/mi),
	getBotResponse: jest.fn().mockReturnValue('Well, not with *THAT* attitude!!!'),
}));

import webhookService from '../../../webhooks/webhookService';
import AttitudeBot from '../reply-bots/attitudeBot';
import { mockMessage, mockWebhookService } from './testUtils';

// Set up the mock implementation
jest.mocked(webhookService).writeMessage = mockWebhookService.writeMessage;

describe('AttitudeBot', () => {
	let attitudeBot: AttitudeBot;

	beforeEach(() => {
		jest.clearAllMocks();
		attitudeBot = new AttitudeBot();
	});

	test('should not respond to bot messages', async () => {
		// Arrange
		const botMessage = mockMessage('I can\'t believe it');
		botMessage.author.bot = true;

		// Act
		await attitudeBot.handleMessage(botMessage);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should respond to messages containing "I can\'t"', async () => {
		// Arrange
		const message = mockMessage('I can\'t believe it');

		// Act
		await attitudeBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalled();
	});

	test('should respond to messages containing "you can\'t"', async () => {
		// Arrange
		const message = mockMessage('you can\'t do that');

		// Act
		await attitudeBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalled();
	});

	test('should respond to messages containing "they can\'t"', async () => {
		// Arrange
		const message = mockMessage('they can\'t handle it');

		// Act
		await attitudeBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalled();
	});

	test('should respond to messages containing "we can\'t"', async () => {
		// Arrange
		const message = mockMessage('we can\'t go there');

		// Act
		await attitudeBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalled();
	});

	test('should not respond to messages without "can\'t" phrases', async () => {
		// Arrange
		const message = mockMessage('This is a normal message');

		// Act
		await attitudeBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});
});
