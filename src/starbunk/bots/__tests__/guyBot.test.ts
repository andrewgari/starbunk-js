// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock getCurrentMemberIdentity and other functions
jest.mock('../botConstants', () => ({
	getBotName: jest.fn().mockReturnValue('GuyBot'),
	getBotAvatar: jest.fn().mockReturnValue('http://example.com/guy.jpg'),
	getBotPattern: jest.fn().mockReturnValue(/\bguy\b/i),
	getBotResponse: jest.fn().mockReturnValue('I am Guy!'),
	getCurrentMemberIdentity: jest.fn().mockResolvedValue({
		avatarUrl: 'http://example.com/custom-guy.jpg',
		botName: 'CustomGuyBot'
	})
}));

// Mock the random utility
jest.mock('../../../utils/random', () => ({
	percentChance: jest.fn().mockReturnValue(true),
}));

// Mock userID
jest.mock('../../../discord/userID', () => ({
	default: {
		Guy: 'guy123'
	}
}));

import { TextChannel } from 'discord.js';
import random from '../../../utils/random';
import webhookService from '../../../webhooks/webhookService';
import GuyBot from '../reply-bots/guyBot';
import { mockMessage, setupTestContainer } from './testUtils';
import { getBotPattern, getBotResponse, getCurrentMemberIdentity } from '../botConstants';
import container from '../../../services/ServiceContainer';

describe('GuyBot', () => {
	let guyBot: GuyBot;

	beforeEach(() => {
		jest.clearAllMocks();
		// Set up container with mock services
		setupTestContainer();
		// Create bot after setting up container
		guyBot = new GuyBot();
	});

	test('should not respond to bot messages', async () => {
		// Arrange
		const botMessage = mockMessage('guy is here');
		botMessage.author.bot = true;

		// Act
		await guyBot.handleMessage(botMessage);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should respond to messages containing "guy"', async () => {
		// Arrange
		const message = mockMessage('hey guy what\'s up');
		(getBotPattern as jest.Mock).mockReturnValueOnce(/guy/i);
		(getCurrentMemberIdentity as jest.Mock).mockResolvedValueOnce({
			avatarUrl: 'http://example.com/custom-guy.jpg',
			botName: 'CustomGuyBot'
		});

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalled();
	});

	test('should not respond if identity is not found', async () => {
		// Arrange
		const message = mockMessage('hey guy');
		(getBotPattern as jest.Mock).mockReturnValueOnce(/guy/i);
		(getCurrentMemberIdentity as jest.Mock).mockResolvedValueOnce(null);

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});
});
