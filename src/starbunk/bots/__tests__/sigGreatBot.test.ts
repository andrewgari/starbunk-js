import { container, ServiceId } from '../../../services/container';
import { SigGreatBotConfig } from '../config/sigGreatBotConfig';
import SigGreatBot from '../reply-bots/sigGreatBot';
import { mockDiscordService, mockLogger, mockMessage, mockWebhookService } from './testUtils';

describe('SigGreatBot', () => {
	let sigGreatBot: SigGreatBot;

	beforeEach(() => {
		jest.clearAllMocks();
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Set up custom bot identity for SigGreat
		mockDiscordService.getRandomMemberAsBotIdentity.mockReturnValue({
			botName: SigGreatBotConfig.Name,
			avatarUrl: 'https://example.com/siggreat.jpg'
		});

		// Create SigGreatBot instance
		sigGreatBot = new SigGreatBot();
		// Mock the isBot method to control when it should return true/false
		jest.spyOn(sigGreatBot, 'isBot').mockImplementation((msg) => msg.author.bot);
	});

	it('should respond to messages containing "sig"', async () => {
		const message = mockMessage('sig is great');
		await sigGreatBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				botName: SigGreatBotConfig.Name,
				content: expect.any(String)
			})
		);
	});

	it('should not respond to bot messages', async () => {
		const message = mockMessage('sig', undefined, true);
		await sigGreatBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages without "sig"', async () => {
		const message = mockMessage('hello world');
		await sigGreatBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
