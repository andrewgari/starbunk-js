import { container, ServiceId } from '../../../services/services';
import { BotBotConfig } from '../config/botBotConfig';
import BotBot from '../reply-bots/botBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

describe('BotBot', () => {
	let botBot: BotBot;

	beforeEach(() => {
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Create BotBot instance
		botBot = new BotBot();
	});

	it('should respond to messages containing "bot"', async () => {
		const message = mockMessage('I am a bot');
		await botBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: BotBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to bot messages', async () => {
		const message = mockMessage('bot', undefined, true);
		await botBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without "bot"', async () => {
		const message = mockMessage('hello world');
		await botBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
