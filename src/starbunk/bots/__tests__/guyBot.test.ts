// Mock the getCurrentMemberIdentity function
jest.mock('../../../discord/discordGuildMemberHelper', () => ({
	getCurrentMemberIdentity: jest.fn().mockResolvedValue({
		userId: "123456",
		avatarUrl: 'https://example.com/custom-guy.jpg',
		botName: 'Custom Guy'
	})
}));

import { Message } from 'discord.js';
import { getCurrentMemberIdentity } from '../../../discord/discordGuildMemberHelper';
import userId from '../../../discord/userId';
import { container, ServiceId } from '../../../services/services';
import random from '../../../utils/random';
import { GuyBotConfig } from '../config/guyBotConfig';
import GuyBot from '../reply-bots/guyBot';
import { createMockMessage, mockLogger, MockWebhookService, mockWebhookService as mockWebhookServiceTest } from './testUtils';

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

		// Create GuyBot instance
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
		expect(mockWebhookServiceTest.writeMessage).not.toHaveBeenCalled();
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
		expect(mockWebhookServiceTest.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: GuyBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should use Guy\'s identity for avatar and name', async () => {
		// Arrange
		message.content = 'Hey guy';

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(mockWebhookServiceTest.writeMessage).toHaveBeenCalledWith(
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
		message.author.id = userId.Guy;

		// Mock random.percentChance to return true (5% chance hit)
		jest.spyOn(random, 'percentChance').mockReturnValueOnce(true);

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(random.percentChance).toHaveBeenCalledWith(5);
		expect(mockWebhookServiceTest.writeMessage).toHaveBeenCalled();
	});

	it('should not respond to messages from Guy if random check fails', async () => {
		// Arrange
		message.content = 'Hello everyone';
		message.author.id = userId.Guy;

		// Mock random.percentChance to return false (5% chance miss)
		jest.spyOn(random, 'percentChance').mockReturnValueOnce(false);

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(random.percentChance).toHaveBeenCalledWith(5);
		expect(mockWebhookServiceTest.writeMessage).not.toHaveBeenCalled();
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
		expect(mockWebhookServiceTest.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without trigger words', async () => {
		// Arrange
		message.content = 'Hello world';

		// Act
		await guyBot.handleMessage(message);

		// Assert
		expect(mockWebhookServiceTest.writeMessage).not.toHaveBeenCalled();
	});
});
