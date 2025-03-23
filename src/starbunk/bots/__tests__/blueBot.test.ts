import { container, ServiceId } from '../../../services/container';
import { BlueBotConfig } from '../config/blueBotConfig';
import BlueBot from '../reply-bots/blueBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

describe('BlueBot', () => {
	let blueBot: BlueBot;

	beforeEach(() => {
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);


		// Create BlueBot instance with the mock logger
		blueBot = new BlueBot();
	});

	it('should respond to direct blue references', async () => {
		const message = mockMessage('blue is my favorite color');
		await blueBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: BlueBotConfig.Name,
				content: BlueBotConfig.Responses.Default
			})
		);
	});

	it('should respond when AI detects a blue reference', async () => {
		const message = mockMessage('The sky is looking nice today');
		await blueBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: BlueBotConfig.Name,
				content: BlueBotConfig.Responses.Default
			})
		);
	});
});
