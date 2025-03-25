import { container, ServiceId } from '../../../services/container';
import { percentChance } from '../../../utils/random';
import { BotBotConfig } from '../config/botBotConfig';
import BotBot from '../reply-bots/botBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

jest.mock('../../../utils/random', () => ({
	percentChance: jest.fn()
}));

describe('BotBot', () => {
	let botBot: BotBot;

	beforeEach(() => {
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
		botBot = new BotBot();
	});

	it('should have 10% response rate', () => {
		expect(botBot['responseRate']).toBe(10);
	});

	it('should respond to bot messages when probability check passes', async () => {
		(percentChance as jest.Mock).mockReturnValue(true);
		const message = mockMessage('I am a bot', undefined, true);
		await botBot.handleMessage(message);

		expect(percentChance).toHaveBeenCalledWith(10);
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				botName: BotBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond when probability check fails', async () => {
		(percentChance as jest.Mock).mockReturnValue(false);
		const message = mockMessage('I am a bot', undefined, true);
		await botBot.handleMessage(message);

		expect(percentChance).toHaveBeenCalledWith(10);
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to human messages', async () => {
		(percentChance as jest.Mock).mockReturnValue(true);
		const message = mockMessage('bot', undefined, false);
		await botBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
