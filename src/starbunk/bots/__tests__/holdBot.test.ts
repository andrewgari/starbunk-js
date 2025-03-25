import { container } from '../../../services/container';
import { HoldBotConfig } from '../config/holdBotConfig';
import HoldBot from '../reply-bots/holdBot';
import { mockMessage, mockWebhookService, setupBotTest } from './testUtils';

describe('HoldBot', () => {
	let holdBot: HoldBot;

	beforeEach(() => {
		// Use the utility function to set up mocks
		setupBotTest(container, {
			botName: HoldBotConfig.Name,
			avatarUrl: HoldBotConfig.Avatars.Default
		});

		// Create HoldBot instance
		holdBot = new HoldBot();
	});

	it('should respond to messages exactly matching "Hold"', async () => {
		const message = mockMessage('Hold');
		await holdBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				botName: HoldBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to bot messages', async () => {
		const message = mockMessage('Hold', undefined, true);
		message.author.bot = true;
		await holdBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages that don\'t exactly match "Hold"', async () => {
		const message = mockMessage('Please wait on for a moment');
		await holdBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
