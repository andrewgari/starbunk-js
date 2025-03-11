import { container, ServiceId } from '../../../services/services';
import { MusicCorrectBotConfig } from '../config/musicCorrectBotConfig';
import MusicCorrectBot from '../reply-bots/musicCorrectBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

describe('MusicCorrectBot', () => {
	let musicCorrectBot: MusicCorrectBot;

	beforeEach(() => {
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Create MusicCorrectBot instance
		musicCorrectBot = new MusicCorrectBot();
	});

	it('should respond to messages containing "music"', async () => {
		const message = mockMessage('I love music');
		await musicCorrectBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: MusicCorrectBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to bot messages', async () => {
		const message = mockMessage('music', undefined, true);
		await musicCorrectBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without "music"', async () => {
		const message = mockMessage('hello world');
		await musicCorrectBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
