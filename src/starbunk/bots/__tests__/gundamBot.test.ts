import { Message } from 'discord.js';
import container from '../../../services/serviceContainer';
import { serviceRegistry } from '../../../services/serviceRegistry';
import GundamBot from '../reply-bots/gundamBot';
import { createMockMessage, MockWebhookService, setupTestContainer } from './testUtils';

describe('GundamBot', () => {
	let gundamBot: GundamBot;
	let message: Message<boolean>;
	let mockWebhookService: MockWebhookService;

	beforeEach(() => {
		jest.clearAllMocks();
		// Set up container with mock services
		setupTestContainer();
		// Get the mock webhook service from the container
		mockWebhookService = container.get(serviceRegistry.WEBHOOK_SERVICE) as MockWebhookService;
		// Create bot after setting up container
		gundamBot = new GundamBot();
		// Create a mock message
		message = createMockMessage('test message', '123456', false);
	});

	it('should not respond to bot messages', async () => {
		// Arrange
		message.author.bot = true;
		message.content = 'I love gundam!';

		// Act
		await gundamBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond to messages containing "gundam"', async () => {
		// Arrange
		message.content = 'I love gundam!';

		// Spy on the sendReply method
		const sendReplySpy = jest.spyOn(gundamBot, 'sendReply');

		// Act
		await gundamBot.handleMessage(message);

		// Assert
		expect(/\bg(u|a)ndam\b/i.test(message.content)).toBe(true);
		expect(sendReplySpy).toHaveBeenCalled();
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should respond to messages containing "gandam"', async () => {
		// Arrange
		message.content = 'Have you seen gandam?';

		// Act
		await gundamBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should not respond to messages not containing gundam or gandam', async () => {
		// Arrange
		message.content = 'hello world';

		// Act
		await gundamBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond with the correct message', async () => {
		// Arrange
		message.content = 'gundam is awesome';

		// Act
		await gundamBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				content: 'That\'s the famous Unicorn Robot, "Gandum". There, I said it.'
			})
		);
	});
});
