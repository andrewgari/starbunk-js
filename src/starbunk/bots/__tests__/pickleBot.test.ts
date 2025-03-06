// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock the random utility
jest.mock('../../../utils/random', () => ({
	percentChance: jest.fn().mockReturnValue(true),
}));

// Import test dependencies
import { TextChannel } from 'discord.js';
import random from '../../../utils/random';
import webhookService from '../../../webhooks/webhookService';
import PickleBot from '../reply-bots/pickleBot';
import { mockMessage, setupTestContainer, mockLogger } from './testUtils';
import { getBotName, getBotAvatar, getBotResponse, getBotPattern } from '../botConstants';
import container from '../../../services/ServiceContainer';

describe('PickleBot', () => {
	let pickleBot: PickleBot;

	beforeEach(() => {
		jest.clearAllMocks();
		// Set up container with mock services
		setupTestContainer();
		// Create bot after setting up container
		pickleBot = new PickleBot();
	});

	test('should not respond to bot messages', () => {
		// Arrange
		const botMessage = mockMessage('test message with pickleBot');
		botMessage.author.bot = true;

		// Act
		pickleBot.handleMessage(botMessage);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should respond to messages matching the pattern', () => {
		// Arrange
		const message = mockMessage('test message with pickleBot');
		// Make sure pattern matches for this test
		(getBotPattern as jest.Mock).mockReturnValueOnce(new RegExp('test message', 'i'));
		
		// Act
		pickleBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalled();
	});

	test('should not respond to messages not matching the pattern', () => {
		// Arrange
		const message = mockMessage('hello world');
		(getBotPattern as jest.Mock).mockReturnValueOnce(/does-not-match/i);
		
		// Act
		pickleBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});
});
