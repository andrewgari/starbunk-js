import userID from '../../../discord/userID';
import random from '../../../utils/random';
import webhookService from '../../../webhooks/webhookService';

// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock the random utility
jest.mock('../../../utils/random', () => ({
	percentChance: jest.fn(),
}));

// Mock the userID
jest.mock('../../../discord/userID', () => ({
	Venn: 'venn123',
}));

// Mock the bot constants
jest.mock('../botConstants', () => {
	const mockResponses = [
		'Sorry, but that was über cringe...',
		'Geez, that was hella cringe...',
		'That was cringe to the max...'
	];

	return {
		getBotName: jest.fn().mockReturnValue('VennBot'),
		getBotAvatar: jest.fn().mockReturnValue('https://example.com/venn-avatar.jpg'),
		getBotPattern: jest.fn().mockReturnValue(/\bcringe\b/i),
		getBotResponse: jest.fn().mockReturnValue(mockResponses[0]),
	};
});

import { getBotAvatar, getBotName, getBotResponse } from '../botConstants';
import VennBot from '../reply-bots/vennBot';
import { mockMessage } from './testUtils';

// Set up the mock implementation
// The setupBotMocks() function in testUtils now handles this

describe('VennBot', () => {
	let vennBot: VennBot;

	beforeEach(() => {
		jest.clearAllMocks();
		vennBot = new VennBot();
		jest.mocked(random.percentChance).mockReturnValue(false);
	});

	test('should have the correct botName', () => {
		// Assert
		expect(vennBot.botName).toBe('VennBot');
		expect(getBotName).toHaveBeenCalledWith('Venn');
	});

	test('should have the correct avatarUrl', () => {
		// Assert
		expect(vennBot.avatarUrl).toBe('https://example.com/venn-avatar.jpg');
		expect(getBotAvatar).toHaveBeenCalledWith('Venn');
	});

	test('should have the correct defaultBotName', () => {
		// Assert
		expect(vennBot.defaultBotName()).toBe('Venn Bot');
	});

	test('should not respond to bot messages', async () => {
		// Arrange
		const botMessage = mockMessage('that was cringe');
		botMessage.author.bot = true;

		// Act
		await vennBot.handleMessage(botMessage);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should respond to messages containing "cringe"', async () => {
		// Arrange
		const message = mockMessage('that was cringe');

		// Act
		await vennBot.handleMessage(message);

		// Assert
		expect(getBotResponse).toHaveBeenCalledWith('Venn', 'Default');
		expect(webhookService.writeMessage).toHaveBeenCalled();
	});

	test('should not respond to messages without "cringe"', async () => {
		// Arrange
		const message = mockMessage('this is a normal message');

		// Act
		await vennBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should respond to Venn\'s messages with 5% chance', async () => {
		// Arrange
		const message = mockMessage('hello everyone');
		message.author.id = userID.Venn;
		jest.mocked(random.percentChance).mockReturnValue(true);

		// Act
		await vennBot.handleMessage(message);

		// Assert
		expect(random.percentChance).toHaveBeenCalledWith(5);
		expect(getBotResponse).toHaveBeenCalledWith('Venn', 'Default');
		expect(webhookService.writeMessage).toHaveBeenCalled();
	});

	test('should not respond to Venn\'s messages if random chance fails', async () => {
		// Arrange
		const message = mockMessage('hello everyone');
		message.author.id = userID.Venn;
		jest.mocked(random.percentChance).mockReturnValue(false);

		// Act
		await vennBot.handleMessage(message);

		// Assert
		expect(random.percentChance).toHaveBeenCalledWith(5);
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});
});
