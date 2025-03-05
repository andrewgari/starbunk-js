// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock the bot constants
jest.mock('../botConstants', () => ({
	getBotName: jest.fn().mockReturnValue('HoldBot'),
	getBotAvatar: jest.fn().mockReturnValue('http://example.com/avatar.png'),
	getBotPattern: jest.fn().mockReturnValue(/\bhold\b/i),
	getBotResponse: jest.fn().mockReturnValue('HODL!'),
}));

import { TextChannel } from 'discord.js';
import webhookService from '../../../webhooks/webhookService';
import HoldBot from '../reply-bots/holdBot';
import { mockMessage } from './testUtils';

// Set up the mock implementation
// The setupBotMocks() function in testUtils now handles this

describe('HoldBot', () => {
	let holdBot: HoldBot;

	beforeEach(() => {
		holdBot = new HoldBot();
		jest.clearAllMocks();
	});

	test('should not respond to bot messages', () => {
		// Arrange
		const botMessage = mockMessage('hold on');
		botMessage.author.bot = true;

		// Act
		holdBot.handleMessage(botMessage);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should respond to messages containing "hold"', () => {
		// Arrange
		const message = mockMessage('please hold the door');

		// Act
		holdBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalledWith(
			message.channel as TextChannel,
			{
				username: 'HoldBot',
				avatarURL: 'http://example.com/avatar.png',
				content: 'HODL!',
				embeds: [],
			}
		);
	});

	test('should not respond to messages without "hold"', () => {
		// Arrange
		const message = mockMessage('hello world');

		// Act
		holdBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});
});
