import { container } from '../../../services/container';
import { PickleBotConfig } from '../config/pickleBotConfig';
import PickleBot from '../reply-bots/pickleBot';
import { mockMessage, mockWebhookService, setupBotTest } from './testUtils';

describe('PickleBot', () => {
	let pickleBot: PickleBot;

	beforeEach(() => {
		// Use the utility function to set up mocks
		setupBotTest(container, {
			botName: PickleBotConfig.Name,
			avatarUrl: PickleBotConfig.Avatars.Default
		});

		// Create PickleBot instance
		pickleBot = new PickleBot();
	});

	it('should respond to messages containing "gremlin"', async () => {
		const message = mockMessage('I saw a gremlin yesterday');
		await pickleBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				botName: PickleBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to bot messages', async () => {
		const message = mockMessage('gremlin', undefined, true);
		message.author.bot = true;
		await pickleBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without "gremlin"', async () => {
		const message = mockMessage('hello world');
		await pickleBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
