import { container, ServiceId } from '../../../services/container';
import { GundamBotConfig } from '../config/gundamBotConfig';
import GundamBot from '../reply-bots/gundamBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

describe('GundamBot', () => {
	let gundamBot: GundamBot;

	beforeEach(() => {
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Create GundamBot instance
		gundamBot = new GundamBot();
	});

	it('should respond to messages containing "gundam"', async () => {
		const message = mockMessage('gundam is awesome');
		await gundamBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				botName: GundamBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to bot messages', async () => {
		const message = mockMessage('gundam', undefined, true);
		await gundamBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without "gundam"', async () => {
		const message = mockMessage('hello world');
		await gundamBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
