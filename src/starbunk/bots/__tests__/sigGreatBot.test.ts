import { container, ServiceId } from '../../../services/services';
import { SigGreatBotConfig } from '../config/sigGreatBotConfig';
import SigGreatBot from '../reply-bots/sigGreatBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

describe('SigGreatBot', () => {
	let sigGreatBot: SigGreatBot;

	beforeEach(() => {
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Create SigGreatBot instance
		sigGreatBot = new SigGreatBot();
	});

	it('should respond to messages containing "sig"', async () => {
		const message = mockMessage('sig is great');
		await sigGreatBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: SigGreatBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to bot messages', async () => {
		const message = mockMessage('sig', undefined, true);
		await sigGreatBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without "sig"', async () => {
		const message = mockMessage('hello world');
		await sigGreatBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
