import { container, ServiceId } from '../../../services/services';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

// Register services before importing the bot class
container.clear();
container.register(ServiceId.Logger, () => mockLogger);
container.register(ServiceId.WebhookService, () => mockWebhookService);

import { BananaBotConfig } from '../config/bananaBotConfig';
import BananaBot from '../reply-bots/bananaBot';

describe('BananaBot', () => {
	let bananaBot: BananaBot;

	beforeEach(() => {
		// Create BananaBot instance
		bananaBot = new BananaBot();
	});

	it('should respond to messages containing "banana"', async () => {
		const message = mockMessage('I love banana');
		await bananaBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: BananaBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to bot messages', async () => {
		const message = mockMessage('banana', undefined, true);
		await bananaBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without "banana"', async () => {
		const message = mockMessage('hello world');
		await bananaBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
