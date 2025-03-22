import { container, ServiceId } from '../../../services/container';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

// Register services before importing the bot class
container.clear();
container.register(ServiceId.Logger, () => mockLogger);
container.register(ServiceId.WebhookService, () => mockWebhookService);

import { CheckBotConfig } from '../config/checkBotConfig';
import CheckBot from '../reply-bots/checkBot';

describe('CheckBot', () => {
	let checkBot: CheckBot;

	beforeEach(() => {
		// Create CheckBot instance
		checkBot = new CheckBot();
		// Clear mock calls
		jest.clearAllMocks();
	});

	it('should respond to messages containing "check"', async () => {
		const message = mockMessage('check this out');
		await checkBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: CheckBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to messages without "check"', async () => {
		const message = mockMessage('hello world');
		await checkBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
