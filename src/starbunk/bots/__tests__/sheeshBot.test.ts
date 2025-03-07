import { Message } from 'discord.js';
import container from '../../../services/serviceContainer';
import { serviceRegistry } from '../../../services/serviceRegistry';
import SheeshBot from '../reply-bots/sheeshBot';
import { createMockMessage, MockWebhookService, setupTestContainer } from './testUtils';

describe('SheeshBot', () => {
	let sheeshBot: SheeshBot;
	let message: Message<boolean>;
	let mockWebhookService: MockWebhookService;

	beforeEach(() => {
		jest.clearAllMocks();
		// Set up container with mock services
		setupTestContainer();
		// Get the mock webhook service from the container
		mockWebhookService = container.get(serviceRegistry.WEBHOOK_SERVICE) as MockWebhookService;
		// Create bot after setting up container
		sheeshBot = new SheeshBot();
		// Create a mock message
		message = createMockMessage('test message', '123456', false);
	});

	it('should not respond to bot messages', async () => {
		// Arrange
		message.author.bot = true;
		message.content = 'sheesh';

		// Act
		await sheeshBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond to messages containing "sheesh"', async () => {
		// Arrange
		message.content = 'sheesh that was close';

		// Spy on the sendReply method
		const sendReplySpy = jest.spyOn(sheeshBot, 'sendReply');

		// Act
		await sheeshBot.handleMessage(message);

		// Assert
		expect(/\bshee+sh\b/i.test(message.content)).toBe(true);
		expect(sendReplySpy).toHaveBeenCalled();
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should respond to messages containing "sheeeeesh"', async () => {
		// Arrange
		message.content = 'sheeeeesh, what happened?';

		// Act
		await sheeshBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should not respond to messages not containing "sheesh"', async () => {
		// Arrange
		message.content = 'hello world';

		// Act
		await sheeshBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not match "sheesh" within other words', async () => {
		// Arrange
		message.content = 'asheeshb';  // "sheesh" inside a word

		// Act
		await sheeshBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages partially matching "shsh"', async () => {
		// Arrange
		message.content = 'shsh';

		// Act
		await sheeshBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond with the correct message format', async () => {
		// Arrange
		message.content = 'sheesh';

		// Act
		await sheeshBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				content: expect.stringMatching(/\bshee+sh\b/i)
			})
		);
	});
});
