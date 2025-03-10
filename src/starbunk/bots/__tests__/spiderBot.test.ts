import { Message } from 'discord.js';
import container from '../../../services/serviceContainer';
import { serviceRegistry } from '../../../services/serviceRegistry';
import { SpiderBotConfig } from '../config/spiderBotConfig';
import SpiderBot from '../reply-bots/spiderBot';
import { createMockMessage, MockWebhookService, setupTestContainer } from './testUtils';
describe('SpiderBot', () => {
	let spiderBot: SpiderBot;
	let message: Message<boolean>;
	let mockWebhookService: MockWebhookService;

	beforeEach(() => {
		jest.clearAllMocks();
		// Set up container with mock services
		setupTestContainer();
		// Get the mock webhook service from the container
		mockWebhookService = container.get(serviceRegistry.WEBHOOK_SERVICE) as MockWebhookService;
		// Create bot after setting up container
		spiderBot = new SpiderBot();
		// Create a mock message
		message = createMockMessage('test message', '123456', false);
	});

	it('should not respond to bot messages', async () => {
		// Arrange
		message.author.bot = true;
		message.content = 'I love spiderman';

		// Act
		await spiderBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond to messages containing "spiderman"', async () => {
		// Arrange
		message.content = 'I love spiderman';

		// Spy on the sendReply method
		const sendReplySpy = jest.spyOn(spiderBot, 'sendReply');

		// Act
		await spiderBot.handleMessage(message);

		// Assert
		expect(/\b(spider-?man|spider\s+-?\s*man)\b/i.test(message.content)).toBe(true);
		expect(sendReplySpy).toHaveBeenCalled();
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should not respond to messages containing "spider-man"', async () => {
		// Arrange
		message.content = 'spider-man is awesome';

		// Act
		await spiderBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond to messages containing "spider man"', async () => {
		// Arrange
		message.content = 'spider man is cool';

		// Act
		await spiderBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should not respond to messages not containing spiderman variations', async () => {
		// Arrange
		message.content = 'hello world';

		// Act
		await spiderBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond with one of the possible responses', async () => {
		// Arrange
		message.content = 'spiderman is my favorite superhero';

		// Act
		await spiderBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				content: expect.any(String)
			})
		);

		// Get the actual content from the last message
		const lastMessage = mockWebhookService.getLastMessage();
		const actualContent = lastMessage?.content;

		// Verify the content is one of the possible responses
		expect(SpiderBotConfig.Responses.Default).toContain(actualContent);
	});

	it('should respond with default message when triggered', async () => {
		const message = createMockMessage('spider');

		await spiderBot.handleMessage(message);

		const lastMessage = mockWebhookService.getLastMessage();
		const actualContent = lastMessage?.content;
		expect(SpiderBotConfig.Responses.Default).toContain(actualContent);
	});
});
