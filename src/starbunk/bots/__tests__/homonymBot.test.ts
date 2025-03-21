import { container, ServiceId } from '../../../services/services';
import { HomonymBotConfig } from '../config/homonymBotConfig';
import HomonymBot from '../reply-bots/homonymBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

describe('HomonymBot', () => {
	let homonymBot: HomonymBot;

	beforeEach(() => {
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Create HomonymBot instance
		homonymBot = new HomonymBot();
	});

	it('should correctly initialize word patterns from config', () => {
		// This just checks if the bot initializes without errors
		expect(homonymBot).toBeDefined();
	});

	it('should respond with correction when "their" is used', async () => {
		const message = mockMessage('I saw their car yesterday');
		await homonymBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: HomonymBotConfig.Name,
				content: 'there'
			})
		);
	});

	it('should respond with correction when "your" is used', async () => {
		const message = mockMessage('Is this your book?');
		await homonymBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: HomonymBotConfig.Name,
				content: 'you\'re'
			})
		);
	});

	it('should respond with correction when "weather" is used', async () => {
		const message = mockMessage('The weather is nice today');
		await homonymBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: HomonymBotConfig.Name,
				content: 'whether'
			})
		);
	});

	it('should not respond to messages without homonyms', async () => {
		const message = mockMessage('This message has no homonyms.');
		await homonymBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	// Note: Unlike some other bots, HomonymBot doesn't explicitly check if the message is from a bot
	// This test verifies that the bot still checks for homonyms regardless of sender
	it('should still respond to messages from bots if they contain homonyms', async () => {
		const message = mockMessage('I saw their car yesterday', undefined, true);
		await homonymBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: HomonymBotConfig.Name,
				content: 'there'
			})
		);
	});

	it('should only respond to whole words, not partial matches', async () => {
		const message = mockMessage('theirs is not a match');
		await homonymBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should match words with different casing', async () => {
		const message = mockMessage('THEIR car is red');
		await homonymBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: HomonymBotConfig.Name,
				content: 'there'
			})
		);
	});

	it('should handle multiple homonym pairs in config correctly', () => {
		// Test that different homonym pairs don't interfere with each other
		expect(HomonymBotConfig.HomonymPairs.length).toBeGreaterThan(1);
	});
});
