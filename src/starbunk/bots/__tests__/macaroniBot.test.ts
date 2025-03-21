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
		macaroniBot = new MacaroniBot();
		// Clear mock calls
		jest.clearAllMocks();
	});

	it('should respond to messages containing "macaroni"', async () => {
		const message = mockMessage('I love macaroni');
		await macaroniBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			message.channel,
			expect.objectContaining({
				username: MacaroniBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to messages without "macaroni"', async () => {
		const message = mockMessage('spaghetti');
		await macaroniBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
