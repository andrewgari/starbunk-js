// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock the bot constants
jest.mock('../botConstants', () => ({
	getBotName: jest.fn().mockReturnValue('BabyBot'),
	getBotAvatar: jest.fn().mockReturnValue('http://example.com/baby.jpg'),
	getBotPattern: jest.fn().mockReturnValue(/\bbaby\b/i),
	getBotResponse: jest.fn().mockReturnValue('https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus-aran.gif'),
}));

import { TextChannel } from 'discord.js';
import webhookService from '../../../webhooks/webhookService';
import BabyBot from '../reply-bots/babyBot';
import { mockMessage } from './testUtils';

// Set up the mock implementation
// The setupBotMocks() function in testUtils now handles this

describe('BabyBot', () => {
	let babyBot: BabyBot;

	beforeEach(() => {
		babyBot = new BabyBot();
		jest.clearAllMocks();
	});

	test('should not respond to bot messages', () => {
		// Arrange
		const botMessage = mockMessage('baby metroid');
		botMessage.author.bot = true;

		// Act
		babyBot.handleMessage(botMessage);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should respond to messages containing "baby"', () => {
		// Arrange
		const message = mockMessage('look at the baby metroid');

		// Act
		babyBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalledWith(
			message.channel as TextChannel,
			{
				username: 'BabyBot',
				avatarURL: 'http://example.com/baby.jpg',
				content: 'https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus-aran.gif',
				embeds: [],
			}
		);
	});

	test('should not respond to messages without "baby"', () => {
		// Arrange
		const message = mockMessage('hello world');

		// Act
		babyBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});
});
