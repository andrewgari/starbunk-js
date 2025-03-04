// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock the random utility
jest.mock('../../../utils/random', () => ({
	percentChance: jest.fn(),
}));

// Mock userID
jest.mock('../../../discord/userID', () => ({
	Guy: 'guy123',
}));

// Mock the bot constants
const mockGetCurrentMemberIdentity = jest.fn();
jest.mock('../botConstants', () => ({
	getBotName: jest.fn().mockReturnValue('GuyBot'),
	getBotAvatar: jest.fn().mockReturnValue('http://example.com/guy.jpg'),
	getBotPattern: jest.fn().mockReturnValue(/\bguy\b/i),
	getBotResponse: jest.fn().mockReturnValue('I am Guy!'),
	getCurrentMemberIdentity: mockGetCurrentMemberIdentity,
}));

import { TextChannel } from 'discord.js';
import userID from '../../../discord/userID';
import random from '../../../utils/random';
import webhookService from '../../../webhooks/webhookService';
import { getBotAvatar, getBotName } from '../botConstants';
import GuyBot from '../reply-bots/guyBot';
import { mockMessage, mockWebhookService } from './testUtils';

// Set up the mock implementation
jest.mocked(webhookService).writeMessage = mockWebhookService.writeMessage;

describe('GuyBot', () => {
	let guyBot: GuyBot;

	beforeEach(() => {
		jest.clearAllMocks();
		mockGetCurrentMemberIdentity.mockResolvedValue({
			userId: 'guy123',
			avatarUrl: 'http://example.com/custom-guy.jpg',
			botName: 'CustomGuyBot',
		});
		guyBot = new GuyBot();
	});

	test('should have the correct initial botName', () => {
		// Assert
		expect(guyBot.botName).toBe('GuyBot');
		expect(getBotName).toHaveBeenCalledWith('Guy');
	});

	test('should have the correct initial avatarUrl', () => {
		// Assert
		expect(guyBot.avatarUrl).toBe('http://example.com/guy.jpg');
		expect(getBotAvatar).toHaveBeenCalledWith('Guy');
	});

	test('should have the correct defaultBotName', () => {
		// Assert
		expect(guyBot.defaultBotName()).toBe('Guy Bot');
	});

	test('should update botName and avatarUrl from getCurrentMemberIdentity', async () => {
		// Arrange
		const message = mockMessage('hey guy what\'s up');

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(guyBot.botName).toBe('CustomGuyBot');
		expect(guyBot.avatarUrl).toBe('http://example.com/custom-guy.jpg');
	});

	test('should not respond to bot messages', async () => {
		// Arrange
		const botMessage = mockMessage('guy fieri');
		botMessage.author.bot = true;

		// Act
		await guyBot.handleMessage(botMessage);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should respond to messages containing "guy"', async () => {
		// Arrange
		const message = mockMessage('hey guy what\'s up');

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalledWith(
			message.channel as TextChannel,
			{
				username: 'CustomGuyBot',
				avatarURL: 'http://example.com/custom-guy.jpg',
				content: 'I am Guy!',
				embeds: [],
			}
		);
	});

	test('should respond to messages from Guy user with 5% chance', async () => {
		// Arrange
		const message = mockMessage('hello world');
		message.author.id = userID.Guy;
		(random.percentChance as jest.Mock).mockReturnValue(true);

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(random.percentChance).toHaveBeenCalledWith(5);
		expect(webhookService.writeMessage).toHaveBeenCalledWith(
			message.channel as TextChannel,
			{
				username: 'CustomGuyBot',
				avatarURL: 'http://example.com/custom-guy.jpg',
				content: 'I am Guy!',
				embeds: [],
			}
		);
	});

	test('should not respond to messages from Guy user if 5% chance not hit', async () => {
		// Arrange
		const message = mockMessage('hello world');
		message.author.id = userID.Guy;
		(random.percentChance as jest.Mock).mockReturnValue(false);

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(random.percentChance).toHaveBeenCalledWith(5);
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should not respond if getCurrentMemberIdentity returns undefined', async () => {
		// Arrange
		mockGetCurrentMemberIdentity.mockResolvedValueOnce(undefined);

		const message = mockMessage('hey guy what\'s up');

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});
});
