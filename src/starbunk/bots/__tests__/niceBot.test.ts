import { container } from '../../../services/container';
import { NiceBotConfig } from '../config/niceBotConfig';
import NiceBot from '../reply-bots/niceBot';
import { mockMessage, mockWebhookService, setupBotTest } from './testUtils';

describe('NiceBot', () => {
	let niceBot: NiceBot;

	beforeEach(() => {
		// Use the utility function to set up mocks
		setupBotTest(container, {
			botName: NiceBotConfig.Name,
			avatarUrl: NiceBotConfig.Avatars.Default
		});

		// Create NiceBot instance
		niceBot = new NiceBot();
	});

	it('should respond to messages containing "69"', async () => {
		const message = mockMessage('The temperature is 69 degrees');
		await niceBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: NiceBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should respond to messages containing "sixty-nine"', async () => {
		const message = mockMessage('This costs sixty-nine dollars');
		await niceBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: NiceBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to bot messages', async () => {
		const message = mockMessage('69', undefined, true);
		message.author.bot = true;
		await niceBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without "69" or "sixty-nine"', async () => {
		const message = mockMessage('hello world');
		await niceBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
