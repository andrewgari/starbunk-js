import { container, ServiceId } from '../../../services/services';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

// Register services before importing the bot class
container.clear();
container.register(ServiceId.Logger, () => mockLogger);
container.register(ServiceId.WebhookService, () => mockWebhookService);

import { MacaroniBotConfig } from '../config/macaroniBotConfig';
import MacaroniBot from '../reply-bots/macaroniBot';

describe('MacaroniBot', () => {
	let macaroniBot: MacaroniBot;

	beforeEach(() => {
		// Create MacaroniBot instance
		macaroniBot = new MacaroniBot(mockLogger, mockWebhookService);
	});

	it('should respond to messages containing "macaroni"', async () => {
		const message = mockMessage('I love macaroni');
		await macaroniBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			message.channel,
			expect.objectContaining({
				username: MacaroniBotConfig.Name,
				content: expect.stringContaining("Are you trying to reach")
			})
		);
	});

	it('should not respond to bot messages', async () => {
		const message = mockMessage('macaroni', undefined, true);
		await macaroniBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without "macaroni"', async () => {
		const message = mockMessage('pasta');
		await macaroniBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});