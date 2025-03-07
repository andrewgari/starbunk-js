import { Message } from 'discord.js';
import container from '../../../services/serviceContainer';
import { ServiceRegistry } from '../../../services/serviceRegistry';
import EzioBot from '../reply-bots/ezioBot';
import { createMockMessage, MockWebhookService, setupTestContainer } from './testUtils';

describe('EzioBot', () => {
	let ezioBot: EzioBot;
	let message: Message<boolean>;
	let mockWebhookService: MockWebhookService;

	beforeEach(() => {
		jest.clearAllMocks();
		// Set up container with mock services
		setupTestContainer();
		// Get the mock webhook service from the container
		mockWebhookService = container.get(ServiceRegistry.WEBHOOK_SERVICE) as MockWebhookService;
		// Create bot after setting up container
		ezioBot = new EzioBot();
		// Create a mock message
		message = createMockMessage('test message', '123456', false);
		// Mock the displayName getter instead of direct assignment
		Object.defineProperty(message.author, 'displayName', {
			get: jest.fn().mockReturnValue('TestUser')
		});
	});

	it('should not respond to bot messages', async () => {
		// Arrange
		message.author.bot = true;

		// Act
		await ezioBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond to messages containing "ezio"', async () => {
		// Arrange
		message.content = 'I love playing as Ezio in Assassin\'s Creed';

		// Spy on the sendReply method
		const sendReplySpy = jest.spyOn(ezioBot, 'sendReply');

		// Act
		await ezioBot.handleMessage(message);

		// Assert
		expect(/\bezio|h?assassin.*\b/i.test(message.content)).toBe(true);
		expect(sendReplySpy).toHaveBeenCalled();
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should respond to messages containing "assassin"', async () => {
		// Arrange
		message.content = 'The assassin strikes from the shadows';

		// Spy on the sendReply method
		const sendReplySpy = jest.spyOn(ezioBot, 'sendReply');

		// Act
		await ezioBot.handleMessage(message);

		// Assert
		expect(/\bezio|h?assassin.*\b/i.test(message.content)).toBe(true);
		expect(sendReplySpy).toHaveBeenCalled();
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should not respond to messages not matching the pattern', async () => {
		// Arrange
		message.content = 'hello world';

		// Act
		await ezioBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond with the correct message including user\'s display name', async () => {
		// Arrange
		message.content = 'ezio is my favorite character';
		// Create a new message with a different displayName
		const customMessage = createMockMessage('ezio is my favorite character', '123456', false);
		// Set the displayName property
		Object.defineProperty(customMessage.author, 'displayName', {
			value: 'Desmond',
			configurable: true
		});

		// Act
		await ezioBot.handleMessage(customMessage);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				content: 'Remember Desmond, Nothing is true; Everything is permitted.'
			})
		);
	});
});
