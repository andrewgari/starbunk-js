import userID from '../../../discord/userID';
import random from '../../../utils/random';
import BananaBot from '../reply-bots/bananaBot';
import { MockLogger, MockWebhookService, createMockMessage, expectWebhookCalledWith } from './testUtils';

describe('BananaBot', () => {
	let bananaBot: BananaBot;
	let mockLogger: MockLogger;
	let mockWebhookService: MockWebhookService;

	beforeEach(() => {
		// Arrange - Set up our test environment
		mockLogger = new MockLogger();
		mockWebhookService = new MockWebhookService();

		// Create the bot with our mocks
		bananaBot = new BananaBot(mockLogger);
		// @ts-expect-error - Set the webhook service property directly
		bananaBot.webhookService = mockWebhookService;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	test('should respond when message contains "banana"', () => {
		// Arrange
		const message = createMockMessage('I love banana smoothies');

		// Act
		bananaBot.handleMessage(message);

		// Assert
		expectWebhookCalledWith(
			mockWebhookService,
			bananaBot.botName,
			expect.any(String) // Any banana response from the array
		);
	});

	test('should not respond to bot messages', () => {
		// Arrange
		const message = createMockMessage('banana', '123456789', true);

		// Act
		bananaBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should not respond to messages without "banana"', () => {
		// Arrange
		const message = createMockMessage('I like apples');

		// Act
		bananaBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	test('should randomly respond to Venn with 5% chance', () => {
		// Arrange
		const message = createMockMessage('Hello everyone', userID.Venn);

		// Mock the random chance to return true (5% chance hit)
		jest.spyOn(random, 'percentChance').mockReturnValue(true);

		// Act
		bananaBot.handleMessage(message);

		// Assert
		expect(random.percentChance).toHaveBeenCalledWith(5);
		expectWebhookCalledWith(
			mockWebhookService,
			bananaBot.botName,
			expect.any(String)
		);
	});

	test('should not respond to Venn if random chance fails', () => {
		// Arrange
		const message = createMockMessage('Hello everyone', userID.Venn);

		// Mock the random chance to return false (95% chance miss)
		jest.spyOn(random, 'percentChance').mockReturnValue(false);

		// Act
		bananaBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
