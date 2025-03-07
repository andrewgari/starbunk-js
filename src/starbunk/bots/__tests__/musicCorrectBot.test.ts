import { Message } from 'discord.js';
import container from '../../../services/serviceContainer';
import { ServiceRegistry } from '../../../services/serviceRegistry';
import MusicCorrectBot from '../reply-bots/musicCorrectBot';
import { createMockMessage, MockWebhookService, setupTestContainer } from './testUtils';

describe('MusicCorrectBot', () => {
	let musicCorrectBot: MusicCorrectBot;
	let message: Message<boolean>;
	let mockWebhookService: MockWebhookService;

	beforeEach(() => {
		jest.clearAllMocks();
		// Set up container with mock services
		setupTestContainer();
		// Get the mock webhook service from the container
		mockWebhookService = container.get(ServiceRegistry.WEBHOOK_SERVICE) as MockWebhookService;
		// Create bot after setting up container
		musicCorrectBot = new MusicCorrectBot();
		// Create a mock message
		message = createMockMessage('test message', '123456', false);
	});

	it('should not respond to bot messages', async () => {
		// Arrange
		message.author.bot = true;
		message.content = '!play some music';

		// Act
		await musicCorrectBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond to messages starting with "!play"', async () => {
		// Arrange
		message.content = '!play some music';

		// Spy on the sendReply method
		const sendReplySpy = jest.spyOn(musicCorrectBot, 'sendReply');

		// Act
		await musicCorrectBot.handleMessage(message);

		// Assert
		expect(/^[?!]play /i.test(message.content)).toBe(true);
		expect(sendReplySpy).toHaveBeenCalled();
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should respond to messages starting with "?play"', async () => {
		// Arrange
		message.content = '?play some music';

		// Act
		await musicCorrectBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should not respond to messages not starting with "!play" or "?play"', async () => {
		// Arrange
		message.content = 'hello world';

		// Act
		await musicCorrectBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond with the correct message including user ID', async () => {
		// Arrange
		message.content = '!play some music';
		const userId = '123456';

		// Act
		await musicCorrectBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				content: expect.stringContaining(`<@${userId}>`)
			})
		);
	});
});
