import { Message } from 'discord.js';
import userID from '../../../discord/userID';
import container from '../../../services/ServiceContainer';
import { ServiceRegistry } from '../../../services/ServiceRegistry';
import Random from '../../../utils/random';
import PickleBot from '../reply-bots/pickleBot';
import { createMockMessage, MockWebhookService, setupTestContainer } from './testUtils';

describe('PickleBot', () => {
	let pickleBot: PickleBot;
	let message: Message<boolean>;
	let mockWebhookService: MockWebhookService;

	beforeEach(() => {
		jest.clearAllMocks();
		// Set up container with mock services
		setupTestContainer();
		// Get the mock webhook service from the container
		mockWebhookService = container.get(ServiceRegistry.WEBHOOK_SERVICE) as MockWebhookService;
		// Create bot after setting up container
		pickleBot = new PickleBot();
		// Create a mock message
		message = createMockMessage('test message', '123456', false);
	});

	it('should not respond to bot messages', async () => {
		// Arrange
		message.author.bot = true;
		message.content = 'gremlin';

		// Act
		await pickleBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond to messages containing "gremlin"', async () => {
		// Arrange
		message.content = 'I hate that gremlin';

		// Spy on the sendReply method
		const sendReplySpy = jest.spyOn(pickleBot, 'sendReply');

		// Act
		await pickleBot.handleMessage(message);

		// Assert
		expect(/gremlin/i.test(message.content)).toBe(true);
		expect(sendReplySpy).toHaveBeenCalled();
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should respond to messages from Sig with a 15% chance', async () => {
		// Arrange
		message.content = 'Hello world';
		message.author.id = userID.Sig;

		jest.spyOn(Random, 'percentChance').mockReturnValueOnce(true);

		// Act
		await pickleBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should not respond to messages from Sig if random chance fails', async () => {
		// Arrange
		message.content = 'Hello world';
		message.author.id = userID.Sig;

		// Make sure percentChance returns false
		jest.spyOn(Random, 'percentChance').mockReturnValueOnce(false);

		// Act
		await pickleBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages not from Sig and not containing "gremlin"', async () => {
		// Arrange
		message.content = 'hello world';
		message.author.id = 'not-sig-id';

		// Act
		await pickleBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond with the correct message', async () => {
		// Arrange
		message.content = 'gremlin';

		// Act
		await pickleBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				content: "Could you repeat that? I don't speak *gremlin*"
			})
		);
	});
});
