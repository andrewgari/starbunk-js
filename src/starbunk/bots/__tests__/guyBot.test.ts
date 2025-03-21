// Mock the getCurrentMemberIdentity function
jest.mock('../../../discord/discordGuildMemberHelper', () => ({
	getCurrentMemberIdentity: jest.fn().mockResolvedValue({
		userId: "123456",
		avatarUrl: 'https://example.com/custom-guy.jpg',
		botName: 'Custom Guy'
	})
}));

import { Message } from 'discord.js';
import userId from '../../../discord/userId';
import { container, ServiceId } from '../../../services/services';
import random from '../../../utils/random';
import GuyBot from '../reply-bots/guyBot';
import { createMockMessage, mockDiscordService, mockLogger, MockWebhookService, mockWebhookService as mockWebhookServiceTest } from './testUtils';

// Mock DiscordService
jest.mock('../../../services/discordService', () => ({
	DiscordService: {
		getInstance: jest.fn().mockImplementation(() => mockDiscordService)
	}
}));

describe('GuyBot', () => {
	let guyBot: GuyBot;
	let message: Message<boolean>;
	let mockWebhookService: MockWebhookService;

	beforeEach(() => {
		jest.clearAllMocks();
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookServiceTest);

		// Set up custom bot identity for Guy
		mockDiscordService.getMemberAsBotIdentity.mockReturnValue({
			botName: 'Custom Guy',
			avatarUrl: 'https://example.com/custom-guy.jpg'
		});

		// Create GuyBot instance and spy on its methods
		guyBot = new GuyBot();
		message = createMockMessage('Hey guy, what\'s up?', '123456', false);

		// Force the shouldSkipMessage to return false for non-bot test messages
		jest.spyOn(guyBot, 'shouldSkipMessage').mockImplementation(() => false);

		// Mock random.percentChance to control random replies
		jest.spyOn(random, 'percentChance').mockImplementation(() => true);
	});

	it('should not respond to bot messages', async () => {
		// Arrange
		message.author.bot = true;
		message.content = 'Hey guy';
		jest.spyOn(guyBot, 'isBot').mockReturnValue(true);
		jest.spyOn(guyBot, 'shouldSkipMessage').mockReturnValue(true);

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(mockWebhookServiceTest.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond to messages containing "guy"', async () => {
		// Arrange
		message.content = 'Hey guy, what\'s up?';

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(/\bguy\b/i.test(message.content)).toBe(true);
		expect(mockDiscordService.getMemberAsBotIdentity).toHaveBeenCalledWith(userId.Guy);
		expect(mockWebhookServiceTest.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: 'Custom Guy',
				avatarURL: 'https://example.com/custom-guy.jpg',
				content: expect.any(String)
			})
		);
	});

	it('should use the correct identity for avatar and name', async () => {
		// Arrange
		message.content = 'guy';

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(mockDiscordService.getMemberAsBotIdentity).toHaveBeenCalledWith(userId.Guy);
		expect(mockWebhookServiceTest.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: 'Custom Guy',
				avatarURL: 'https://example.com/custom-guy.jpg'
			})
		);
	});

	it('should respond 5% of the time to messages from the targeted user', async () => {
		// Arrange
		message.content = 'No mention of the G word here';
		message.author.id = userId.Guy;
		jest.spyOn(random, 'percentChance').mockReturnValueOnce(true);

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(random.percentChance).toHaveBeenCalledWith(5);
		expect(mockWebhookServiceTest.writeMessage).toHaveBeenCalled();
	});

	it('should not respond if identity cannot be found', async () => {
		// Arrange
		message.content = 'guy';
		mockDiscordService.getMemberAsBotIdentity.mockReturnValueOnce(undefined);

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(mockDiscordService.getMemberAsBotIdentity).toHaveBeenCalledWith(userId.Guy);
		expect(mockWebhookServiceTest.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without trigger words', async () => {
		// Arrange
		message.content = 'No trigger words here';
		message.author.id = 'not-guy-id';

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(mockWebhookServiceTest.writeMessage).not.toHaveBeenCalled();
	});
});
