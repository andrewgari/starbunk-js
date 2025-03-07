import { Message } from 'discord.js';
import container from '../../../services/serviceContainer';
import { ServiceRegistry } from '../../../services/serviceRegistry';
import NiceBot from '../reply-bots/niceBot';
import { createMockMessage, MockWebhookService, setupTestContainer } from './testUtils';

describe('NiceBot', () => {
	let niceBot: NiceBot;
	let message: Message<boolean>;
	let mockWebhookService: MockWebhookService;

	beforeEach(() => {
		jest.clearAllMocks();
		// Set up container with mock services
		setupTestContainer();
		// Get the mock webhook service from the container
		mockWebhookService = container.get(ServiceRegistry.WEBHOOK_SERVICE) as MockWebhookService;
		// Create bot after setting up container
		niceBot = new NiceBot();
		// Create a mock message
		message = createMockMessage('test message', '123456', false);
	});

	it('should not respond to bot messages', async () => {
		// Arrange
		message.author.bot = true;
		message.content = 'The number is 69';

		// Act
		await niceBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond to messages containing the number 69', async () => {
		// Arrange
		message.content = 'The number is 69';

		// Spy on the sendReply method
		const sendReplySpy = jest.spyOn(niceBot, 'sendReply');

		// Act
		await niceBot.handleMessage(message);

		// Assert
		expect(/\b69|(sixty-?nine)\b/i.test(message.content)).toBe(true);
		expect(sendReplySpy).toHaveBeenCalled();
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should respond to messages containing sixty-nine', async () => {
		// Arrange
		message.content = 'Let me tell you about sixty-nine';

		// Act
		await niceBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should respond to messages containing sixtynine', async () => {
		// Arrange
		message.content = 'The code is sixtynine';

		// Act
		await niceBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should not respond to messages not containing 69 or sixty-nine', async () => {
		// Arrange
		message.content = 'hello world';

		// Act
		await niceBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond with "Nice."', async () => {
		// Arrange
		message.content = 'The answer is 69';

		// Act
		await niceBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				content: 'Nice.'
			})
		);
	});
});
