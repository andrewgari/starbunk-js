import { container, ServiceId } from '../../../services/container';
import { EzioBotConfig } from '../config/ezioBotConfig';
import EzioBot from '../reply-bots/ezioBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

describe('EzioBot', () => {
	let ezioBot: EzioBot;

	beforeEach(() => {
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Create EzioBot instance
		ezioBot = new EzioBot();
	});

	it('should respond to messages containing "ezio"', async () => {
		const message = mockMessage('ezio is awesome');
		await ezioBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				botName: EzioBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to bot messages', async () => {
		const message = mockMessage('ezio', undefined, true);
		await ezioBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without "ezio"', async () => {
		const message = mockMessage('hello world');
		await ezioBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
