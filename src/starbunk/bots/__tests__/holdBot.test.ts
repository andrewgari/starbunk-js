import { container, ServiceId } from '../../../services/services';
import { HoldBotConfig } from '../config/holdBotConfig';
import HoldBot from '../reply-bots/holdBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

describe('HoldBot', () => {
	let holdBot: HoldBot;

	beforeEach(() => {
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Create HoldBot instance
		holdBot = new HoldBot();
	});

	it('should respond to messages containing "hold"', async () => {
		const message = mockMessage('hold on a second');
		await holdBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: HoldBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to bot messages', async () => {
		const message = mockMessage('hold', undefined, true);
		await holdBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without "hold"', async () => {
		const message = mockMessage('hello world');
		await holdBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
