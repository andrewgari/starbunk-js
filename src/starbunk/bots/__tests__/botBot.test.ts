// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock the random utility
jest.mock('../../../utils/random', () => ({
	percentChance: jest.fn().mockReturnValue(true),
}));

// Import test dependencies
import { ClientUser } from 'discord.js';
import random from '../../../utils/random';
import webhookService from '../../../webhooks/webhookService';
import BotBot from '../reply-bots/botBot';
import { mockMessage, setupTestContainer } from './testUtils';
import { getBotPattern } from '../botConstants';

describe('BotBot', () => {
	let botBot: BotBot;

	beforeEach(() => {
		jest.clearAllMocks();
		// Set up container with mock services
		setupTestContainer();
		// Create bot after setting up container
		botBot = new BotBot();
	});

	test('should not respond to self messages', () => {
		// Arrange
		const botMessage = mockMessage('self message');
		botMessage.author.bot = true;
		botMessage.client.user = { id: botMessage.author.id } as ClientUser;

		// Act
		botBot.handleMessage(botMessage);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should respond to other bot messages', () => {
		// Arrange
		const botMessage = mockMessage('other bot message');
		botMessage.author.bot = true;
		botMessage.client.user = { id: 'different-id' } as ClientUser;
		(random.percentChance as jest.Mock).mockReturnValueOnce(true);

		// Act
		botBot.handleMessage(botMessage);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalled();
	});

	test('should not respond to messages not matching the pattern', () => {
		// Arrange
		const message = mockMessage('hello world');
		(getBotPattern as jest.Mock).mockReturnValueOnce(/does-not-match/i);
		
		// Act
		botBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});
});
