import { container, ServiceId } from '../../../services/services';
import { SheeshBotConfig } from '../config/sheeshBotConfig';
import SheeshBot from '../reply-bots/sheeshBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

describe('SheeshBot', () => {
	let sheeshBot: SheeshBot;

	beforeEach(() => {
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Create SheeshBot instance
		sheeshBot = new SheeshBot(mockLogger);
	});

	it('should respond to messages containing "sheesh"', async () => {
		const message = mockMessage('sheesh that was amazing');
		await sheeshBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: SheeshBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to bot messages', async () => {
		const message = mockMessage('sheesh', undefined, true);
		await sheeshBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without "sheesh"', async () => {
		const message = mockMessage('hello world');
		await sheeshBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond to messages containing "sheeeeesh"', async () => {
		// Arrange
		const message = mockMessage('sheeeeesh, what happened?');

		// Act
		await sheeshBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should not match "sheesh" within other words', async () => {
		// Arrange
		const message = mockMessage('asheeshb');  // "sheesh" inside a word

		// Act
		await sheeshBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages partially matching "shsh"', async () => {
		// Arrange
		const message = mockMessage('shsh');

		// Act
		await sheeshBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond with the correct message format', async () => {
		// Arrange
		const message = mockMessage('sheesh');

		// Act
		await sheeshBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				content: expect.stringMatching(/\bshee+sh\b/i)
			})
		);
	});
});
