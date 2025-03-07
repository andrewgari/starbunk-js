import { Message } from 'discord.js';
import container from '../../../services/serviceContainer';
import { serviceRegistry } from '../../../services/serviceRegistry';
import Random from '../../../utils/random';
import BotBot from '../reply-bots/botBot';
import { createMockMessage, MockWebhookService, setupTestContainer } from './testUtils';

describe('BotBot', () => {
	let botBot: BotBot;
	let message: Message<boolean>;
	let mockWebhookService: MockWebhookService;

	beforeEach(() => {
		jest.clearAllMocks();
		// Set up container with mock services
		setupTestContainer();
		// Get the mock webhook service from the container
		mockWebhookService = container.get(serviceRegistry.WEBHOOK_SERVICE) as MockWebhookService;
		// Create bot after setting up container
		botBot = new BotBot();
		// Create a mock message
		message = createMockMessage('test message', '123456', false);
	});

	it('should not respond to self messages', async () => {
		// Arrange
		message.author.bot = true;
		// Mock isSelf to return true
		jest.spyOn(botBot, 'isSelf').mockReturnValue(true);

		// Act
		await botBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond to bot messages with 10% chance', async () => {
		// Arrange
		message.author.bot = true;
		// Mock isSelf to return false
		jest.spyOn(botBot, 'isSelf').mockReturnValue(false);
		// Mock percentChance to return true (10% chance)
		jest.spyOn(Random, 'percentChance').mockReturnValue(true);

		// Spy on the sendReply method
		const sendReplySpy = jest.spyOn(botBot, 'sendReply');

		// Act
		await botBot.handleMessage(message);

		// Assert
		expect(Random.percentChance).toHaveBeenCalledWith(10);
		expect(sendReplySpy).toHaveBeenCalled();
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should not respond to bot messages when random chance fails', async () => {
		// Arrange
		message.author.bot = true;
		// Mock isSelf to return false
		jest.spyOn(botBot, 'isSelf').mockReturnValue(false);
		// Mock percentChance to return false (90% chance)
		jest.spyOn(Random, 'percentChance').mockReturnValue(false);

		// Act
		await botBot.handleMessage(message);

		// Assert
		expect(Random.percentChance).toHaveBeenCalledWith(10);
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to non-bot messages', async () => {
		// Arrange
		message.author.bot = false;
		// Mock isSelf to return false
		jest.spyOn(botBot, 'isSelf').mockReturnValue(false);

		// Act
		await botBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond with the correct message', async () => {
		// Arrange
		message.author.bot = true;
		// Mock isSelf to return false
		jest.spyOn(botBot, 'isSelf').mockReturnValue(false);
		// Mock percentChance to return true
		jest.spyOn(Random, 'percentChance').mockReturnValue(true);

		// Act
		await botBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				content: 'Hello fellow bot!'
			})
		);
	});
});
