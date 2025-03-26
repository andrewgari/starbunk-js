import { container, ServiceId } from '../../../services/container';
import { DiscordService } from '../../../services/discordService';
import { SigGreatBotConfig } from '../config/sigGreatBotConfig';
import SigGreatBot from '../reply-bots/sigGreatBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

// Mock DiscordService
jest.mock('../../../services/discordService', () => {
	return {
		DiscordService: {
			getInstance: jest.fn().mockReturnValue({
				getRandomBotProfile: jest.fn().mockReturnValue({
					botName: 'RandomBot',
					avatarUrl: 'https://example.com/random.png'
				}),
				sendMessageWithBotIdentity: jest.fn().mockResolvedValue(undefined)
			})
		}
	};
});

describe('SigGreatBot', () => {
	let bot: SigGreatBot;
	let discordServiceMock: any;

	beforeEach(() => {
		// Arrange
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
		discordServiceMock = DiscordService.getInstance();
		bot = new SigGreatBot();
	});

	it('should respond to messages containing "sig"', async () => {
		// Arrange
		const message = mockMessage('sig is great');
		
		// Act
		await bot.handleMessage(message);

		// Assert
		expect(discordServiceMock.sendMessageWithBotIdentity).toHaveBeenCalledWith(
			message.channel.id,
			expect.anything(),
			SigGreatBotConfig.Responses.Default
		);
	});

	it('should not respond to bot messages', async () => {
		// Arrange
		const message = mockMessage('sig', undefined, true);
		
		// Act
		await bot.handleMessage(message);

		// Assert
		expect(discordServiceMock.sendMessageWithBotIdentity).not.toHaveBeenCalled();
	});

	it('should not respond to messages without "sig"', async () => {
		// Arrange
		const message = mockMessage('hello world');
		
		// Act
		await bot.handleMessage(message);

		// Assert
		expect(discordServiceMock.sendMessageWithBotIdentity).not.toHaveBeenCalled();
	});
});