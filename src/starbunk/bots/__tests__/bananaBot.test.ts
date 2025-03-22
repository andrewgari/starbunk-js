import { container, ServiceId } from '../../../services/container';
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
		// Clear mock calls
		jest.clearAllMocks();
	});

	it('should respond to messages containing "banana"', async () => {
		const message = mockMessage('I like banana');
		await bananaBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: BananaBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to messages without "banana"', async () => {
		const message = mockMessage('apple');
		await bananaBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
