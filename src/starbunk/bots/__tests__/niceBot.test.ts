import { container, ServiceId } from '../../../services/services';
import { NiceBotConfig } from '../config/niceBotConfig';
import NiceBot from '../reply-bots/niceBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

describe('NiceBot', () => {
	let niceBot: NiceBot;

	beforeEach(() => {
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Create NiceBot instance
		niceBot = new NiceBot();
	});

	it('should respond to messages containing "nice"', async () => {
		const message = mockMessage('nice job!');
		await niceBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: NiceBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to bot messages', async () => {
		const message = mockMessage('nice', undefined, true);
		await niceBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without "nice"', async () => {
		const message = mockMessage('hello world');
		await niceBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
