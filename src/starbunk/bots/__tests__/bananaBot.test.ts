import userID from '../../../discord/userId';
import { getWebhookService } from '../../../services/bootstrap';
import random from '../../../utils/random';
import BananaBot from '../reply-bots/bananaBot';
import { MockWebhookService, createMockMessage, expectWebhookCalledWith } from './testUtils';

jest.mock('../../../services/bootstrap');

describe('BananaBot', () => {
	let bananaBot: BananaBot;
	let mockWebhookService: MockWebhookService;

	beforeEach(() => {
		mockWebhookService = new MockWebhookService();
		(getWebhookService as jest.Mock).mockReturnValue(mockWebhookService);
		bananaBot = new BananaBot();
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
