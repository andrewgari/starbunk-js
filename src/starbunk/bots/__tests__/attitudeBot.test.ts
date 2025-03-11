import { container, ServiceId } from '../../../services/services';
import { AttitudeBotConfig } from '../config/attitudeBotConfig';
import AttitudeBot from '../reply-bots/attitudeBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

describe('AttitudeBot', () => {
	let attitudeBot: AttitudeBot;

	beforeEach(() => {
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Create AttitudeBot instance
		attitudeBot = new AttitudeBot();
	});

	it('should respond to messages containing "attitude"', async () => {
		const message = mockMessage('You have an attitude problem!');
		await attitudeBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: AttitudeBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to bot messages', async () => {
		const message = mockMessage('attitude');
		message.author.bot = true;
		await attitudeBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without "attitude"', async () => {
		const message = mockMessage('hello world');
		await attitudeBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
