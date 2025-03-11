// Mock the webhook service
import { container, ServiceId } from '../../../services/services';
import { BabyBotConfig } from '../config/babyBotConfig';
import BabyBot from '../reply-bots/babyBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

describe('BabyBot', () => {
	let babyBot: BabyBot;

	beforeEach(() => {
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Create BabyBot instance
		babyBot = new BabyBot();
	});

	it('should respond to messages containing "baby"', async () => {
		const message = mockMessage('I love babies!');
		await babyBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: BabyBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to bot messages', async () => {
		// Create a bot message by modifying the mock message's author.bot property
		const message = mockMessage('baby');
		message.author.bot = true;
		await babyBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without "baby"', async () => {
		const message = mockMessage('hello world');
		await babyBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
