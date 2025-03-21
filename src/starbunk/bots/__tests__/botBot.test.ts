import { container, ServiceId } from '../../../services/services';
import Random from '../../../utils/random';
import { BotBotConfig } from '../config/botBotConfig';
import BotBot from '../reply-bots/botBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

describe('BotBot', () => {
	let botBot: BotBot;

	beforeEach(() => {
		jest.clearAllMocks();
		// Mock Random.percentChance to always return true for tests
		jest.spyOn(Random, 'percentChance').mockReturnValue(true);

		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Create BotBot instance
		botBot = new BotBot();
	});

	it('should respond to bot messages', async () => {
		const message = mockMessage('I am a bot', undefined, true);
		await botBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: BotBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to human messages', async () => {
		const message = mockMessage('bot', undefined, false);
		await botBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respect random chance for bot messages', async () => {
		// Set up Random.percentChance to return false
		jest.spyOn(Random, 'percentChance').mockReturnValueOnce(false);

		const message = mockMessage('I am a bot', undefined, true);
		await botBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
