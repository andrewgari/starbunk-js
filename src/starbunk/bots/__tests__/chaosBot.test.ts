import { container, ServiceId } from '../../../services/container';
import { ChaosBotConfig } from '../config/chaosBotConfig';
import ChaosBot from '../reply-bots/chaosBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

describe('ChaosBot', () => {
	let chaosBot: ChaosBot;

	beforeEach(() => {
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Create ChaosBot instance
		chaosBot = new ChaosBot();
	});

	it('should respond to messages containing "chaos"', async () => {
		const message = mockMessage('chaos reigns');
		await chaosBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				botName: ChaosBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to bot messages', async () => {
		const message = mockMessage('chaos', undefined, true);
		await chaosBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without "chaos"', async () => {
		const message = mockMessage('hello world');
		await chaosBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
