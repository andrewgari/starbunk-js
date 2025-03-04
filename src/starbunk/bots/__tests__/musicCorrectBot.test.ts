// Mock the webhook service
jest.mock('../../../webhooks/webhookService');

// Mock the Logger
jest.mock('../../../services/Logger', () => ({
	Logger: jest.fn().mockImplementation(() => ({
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	})),
}));

// Mock the LoggerFactory
jest.mock('../../../services/LoggerFactory', () => ({
	LoggerFactory: {
		getInstance: jest.fn().mockReturnValue({
			getLogger: jest.fn().mockReturnValue({
				debug: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
			}),
		}),
	},
}));

// Mock the bot constants
jest.mock('../botConstants', () => {
	const mockResponse = jest.fn().mockImplementation((userId) =>
		`Hey <@${userId}>, Buddy.\nI see you're trying to activate the music bot...`
	);

	return {
		getBotName: jest.fn().mockReturnValue('Music Correct Bot'),
		getBotAvatar: jest.fn().mockReturnValue('default_music_avatar.png'),
		getBotPattern: jest.fn().mockReturnValue(/^[?!]play /i),
		getBotResponse: jest.fn().mockImplementation((_botKey, _responseKey, userId) => {
			// This simulates the behavior of the real getBotResponse function
			// which calls the function stored in BotConstants[botKey].Responses[responseKey]
			return mockResponse(userId);
		}),
	};
});

import webhookService from '../../../webhooks/webhookService';
import { getBotAvatar, getBotName, getBotResponse } from '../botConstants';
import MusicCorrectBot from '../reply-bots/musicCorrectBot';
import { mockMessage, mockWebhookService } from './testUtils';

// Set up the mock implementation
jest.mocked(webhookService).writeMessage = mockWebhookService.writeMessage;

describe('MusicCorrectBot', () => {
	let musicCorrectBot: MusicCorrectBot;

	beforeEach(() => {
		jest.clearAllMocks();
		musicCorrectBot = new MusicCorrectBot();
	});

	test('should have the correct botName', () => {
		// Assert
		expect(musicCorrectBot.botName).toBe('Music Correct Bot');
		expect(getBotName).toHaveBeenCalledWith('MusicCorrect');
	});

	test('should have the correct avatarUrl', () => {
		// Assert
		expect(musicCorrectBot.avatarUrl).toBe('default_music_avatar.png');
		expect(getBotAvatar).toHaveBeenCalledWith('MusicCorrect');
	});

	test('should not respond to bot messages', () => {
		// Arrange
		const botMessage = mockMessage('!play some music');
		botMessage.author.bot = true;

		// Act
		musicCorrectBot.handleMessage(botMessage);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should respond to messages starting with "!play"', () => {
		// Arrange
		const message = mockMessage('!play some music');

		// Act
		musicCorrectBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalled();
		expect(getBotResponse).toHaveBeenCalledWith('MusicCorrect', 'Default', message.author.id);
	});

	test('should respond to messages starting with "?play"', () => {
		// Arrange
		const message = mockMessage('?play some music');

		// Act
		musicCorrectBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).toHaveBeenCalled();
		expect(getBotResponse).toHaveBeenCalledWith('MusicCorrect', 'Default', message.author.id);
	});

	test('should not respond to messages not starting with "!play" or "?play"', () => {
		// Arrange
		const message = mockMessage('Hey, can you play some music?');

		// Act
		musicCorrectBot.handleMessage(message);

		// Assert
		expect(webhookService.writeMessage).not.toHaveBeenCalled();
	});
});
