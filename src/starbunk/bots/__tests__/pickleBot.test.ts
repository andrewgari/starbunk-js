import { container, ServiceId } from '../../../services/services';
import { PickleBotConfig } from '../config/pickleBotConfig';
import PickleBot from '../reply-bots/pickleBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

describe('PickleBot', () => {
	let pickleBot: PickleBot;

	beforeEach(() => {
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Create PickleBot instance
		pickleBot = new PickleBot();
	});

	it('should respond to messages containing "pickle"', async () => {
		const message = mockMessage('I love pickles');
		await pickleBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: PickleBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to bot messages', async () => {
		const message = mockMessage('pickle', undefined, true);
		await pickleBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without "pickle"', async () => {
		const message = mockMessage('hello world');
		await pickleBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
