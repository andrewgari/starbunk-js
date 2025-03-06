// Mock the getCurrentMemberIdentity function
jest.mock('../../../discord/discordGuildMemberHelper', () => ({
	getCurrentMemberIdentity: jest.fn().mockResolvedValue({
		userId: "123456",
		avatarUrl: 'https://example.com/custom-guy.jpg',
		botName: 'Custom Guy'
	})
}));

// Mock the random utility
jest.mock('../../../utils/random', () => ({
	percentChance: jest.fn().mockReturnValue(true)
}));

// Mock the GuyBotConfig to ensure it returns a consistent response
jest.mock('../config/GuyBotConfig', () => ({
	GuyBotConfig: {
		Name: 'GuyBot',
		Avatars: {
			Default: 'https://i.imgur.com/default-guy.jpg'
		},
		Patterns: {
			Default: /\bguy\b/i
		},
		Responses: {
			Default: jest.fn().mockReturnValue('What!? What did you say?')
		}
	}
}));

import { Message } from 'discord.js';
import { getCurrentMemberIdentity } from '../../../discord/discordGuildMemberHelper';
import userID from '../../../discord/userID';
import random from '../../../utils/random';
import GuyBot from '../reply-bots/guyBot';
import container from '../../../services/ServiceContainer';
import { ServiceRegistry } from '../../../services/ServiceRegistry';
import { createMockMessage, MockWebhookService, setupTestContainer } from './testUtils';

describe('GuyBot', () => {
	let guyBot: GuyBot;
	let message: Message<boolean>;
	let mockWebhookService: MockWebhookService;

	beforeEach(() => {
		jest.clearAllMocks();
		// Set up container with mock services
		setupTestContainer();
		// Get the mock webhook service from the container
		mockWebhookService = container.get(ServiceRegistry.WEBHOOK_SERVICE) as MockWebhookService;
		// Create bot after setting up container
		guyBot = new GuyBot();
		// Create a mock message
		message = createMockMessage('Hey guy, what\'s up?', '123456', false);
	});

	it('should not respond to bot messages', async () => {
		// Arrange
		message.author.bot = true;
		message.content = 'Hey guy';

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond to messages containing "guy"', async () => {
		// Arrange
		message.content = 'Hey guy, what\'s up?';

		// Spy on the sendReply method
		const sendReplySpy = jest.spyOn(guyBot, 'sendReply');

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(/\bguy\b/i.test(message.content)).toBe(true);
		expect(getCurrentMemberIdentity).toHaveBeenCalled();
		expect(sendReplySpy).toHaveBeenCalled();
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should use Guy\'s identity for avatar and name', async () => {
		// Arrange
		message.content = 'Hey guy';

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(guyBot.avatarUrl).toBe('https://example.com/custom-guy.jpg');
		expect(guyBot.botName).toBe('Custom Guy');
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: 'Custom Guy',
				avatarURL: 'https://example.com/custom-guy.jpg'
			})
		);
	});

	it('should randomly respond to messages from Guy with 5% chance', async () => {
		// Arrange
		message.content = 'Hello everyone';
		message.author.id = userID.Guy;

		// Mock random.percentChance to return true (5% chance hit)
		(random.percentChance as jest.Mock).mockReturnValueOnce(true);

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(random.percentChance).toHaveBeenCalledWith(5);
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should not respond to messages from Guy if random check fails', async () => {
		// Arrange
		message.content = 'Hello everyone';
		message.author.id = userID.Guy;

		// Mock random.percentChance to return false (5% chance miss)
		(random.percentChance as jest.Mock).mockReturnValueOnce(false);

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(random.percentChance).toHaveBeenCalledWith(5);
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond if identity cannot be found', async () => {
		// Arrange
		message.content = 'Hey guy';

		// Mock getCurrentMemberIdentity to return undefined
		(getCurrentMemberIdentity as jest.Mock).mockResolvedValueOnce(undefined);

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(getCurrentMemberIdentity).toHaveBeenCalled();
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without trigger words', async () => {
		// Arrange
		message.content = 'Hello world';

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
