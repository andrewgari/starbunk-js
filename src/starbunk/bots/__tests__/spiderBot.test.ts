import { container, ServiceId } from '../../../services/services';
import { SpiderBotConfig } from '../config/spiderBotConfig';
import SpiderBot from '../reply-bots/spiderBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

describe('SpiderBot', () => {
	let spiderBot: SpiderBot;

	beforeEach(() => {
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Create SpiderBot instance
		spiderBot = new SpiderBot();
	});

	it('should respond to messages containing "spider"', async () => {
		const message = mockMessage('I saw a spider today');
		await spiderBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: SpiderBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to bot messages', async () => {
		const message = mockMessage('spider', undefined, true);
		await spiderBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without "spider"', async () => {
		const message = mockMessage('hello world');
		await spiderBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond with a random spider fact', async () => {
		const message = mockMessage('spider');
		await spiderBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: SpiderBotConfig.Name,
				content: expect.stringContaining('Did you know')
			})
		);
	});
});
