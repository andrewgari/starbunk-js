// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock the random utility
jest.mock('../../../utils/random', () => ({
	percentChance: jest.fn().mockReturnValue(true),
}));

// Import test dependencies

import webhookService from '../../../webhooks/webhookService';
import { getBotPattern } from '../botConstants';
import SheeshBot from '../reply-bots/sheeshBot';
import { mockMessage, setupTestContainer } from './testUtils';

describe('SheeshBot', () => {
	let sheeshBot: SheeshBot;

	beforeEach(() => {
		jest.clearAllMocks();
		// Set up container with mock services
		setupTestContainer();
		// Create bot after setting up container
		sheeshBot = new SheeshBot();
	});

	test('should not respond to bot messages', () => {
		// Arrange
		const botMessage = mockMessage('test message with sheeshBot');
		botMessage.author.bot = true;

		// Act
		sheeshBot.handleMessage(botMessage);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should respond to messages matching the pattern', () => {
		// Arrange
		const message = mockMessage('test message with sheeshBot');
		// Make sure pattern matches for this test
		(getBotPattern as jest.Mock).mockReturnValueOnce(new RegExp('test message', 'i'));

		// Act
		sheeshBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalled();
	});

	test('should not respond to messages not matching the pattern', () => {
		// Arrange
		const message = mockMessage('hello world');
		(getBotPattern as jest.Mock).mockReturnValueOnce(/does-not-match/i);

		// Act
		sheeshBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});
});
