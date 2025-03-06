import { Message } from 'discord.js';
import userID from '../../../discord/userID';
import random from '../../../utils/random';
import * as botConstants from '../botConstants';
import GuyBot from '../reply-bots/guyBot';
import { MockLogger, MockWebhookService, createMockMessage, expectWebhookCalledWith } from './testUtils';

// Mock random utility
jest.mock('../../../utils/random', () => ({
	percentChance: jest.fn()
}));

// Mock botConstants
jest.mock('../botConstants', () => {
	return {
		getCurrentMemberIdentity: jest.fn()
	};
});

// Mock GuyBotConfig
jest.mock('../config/GuyBotConfig', () => {
	return {
		GuyBotConfig: {
			Name: 'GuyBot',
			Avatars: {
				Default: 'https://example.com/guy.jpg'
			},
			Patterns: {
				Default: /\bguy\b/i
			},
			Responses: {
				Default: jest.fn().mockReturnValue('What!? What did you say?')
			}
		}
	};
});

describe('GuyBot', () => {
	let guyBot: GuyBot;
	let message: Message;
	let mockLogger: MockLogger;
	let mockWebhookService: MockWebhookService;

	beforeEach(() => {
		// Arrange - Set up our test environment
		mockLogger = new MockLogger();
		mockWebhookService = new MockWebhookService();

		// Create the bot with our mocks
		guyBot = new GuyBot(mockLogger);
		// @ts-expect-error - Set the webhook service property directly
		guyBot.webhookService = mockWebhookService;

		// Create a mock message
		message = createMockMessage('Hey guy, what\'s up?');

		// Mock getCurrentMemberIdentity to return a user identity
		(botConstants.getCurrentMemberIdentity as jest.Mock).mockResolvedValue({
			userId: userID.Guy,
			avatarUrl: 'https://example.com/custom-guy.jpg',
			botName: 'Custom Guy'
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	test('should respond when message contains "guy"', async () => {
		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(botConstants.getCurrentMemberIdentity).toHaveBeenCalledWith(userID.Guy, message.guild);
		expectWebhookCalledWith(
			mockWebhookService,
			'Custom Guy',
			'What!? What did you say?'
		);
	});

	test('should use Guy\'s identity for avatar and name', async () => {
		// Arrange
		const message = createMockMessage('Hey guy');

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(guyBot.botName).toBe('Custom Guy');
		expect(guyBot.avatarUrl).toBe('https://example.com/custom-guy.jpg');
	});

	test('should randomly respond to messages from Guy with 5% chance', async () => {
		// Arrange
		const message = createMockMessage('Hello everyone', userID.Guy);

		// Mock the random chance to return true (5% chance hit)
		(random.percentChance as jest.Mock).mockReturnValue(true);

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(random.percentChance).toHaveBeenCalledWith(5);
		expectWebhookCalledWith(
			mockWebhookService,
			'Custom Guy',
			'What!? What did you say?'
		);
	});

	test('should not respond if identity cannot be found', async () => {
		// Arrange
		const message = createMockMessage('Hey guy');

		// Mock getCurrentMemberIdentity to return undefined
		(botConstants.getCurrentMemberIdentity as jest.Mock).mockResolvedValue(undefined);

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should not respond to bot messages', async () => {
		// Arrange
		const message = createMockMessage('guy', '123456789', true);

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should not respond to messages without trigger words', async () => {
		// Arrange
		const message = createMockMessage('Hello world');

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
